import os
import time
import json
import logging
from typing import Dict, Any, List, Optional, TypedDict
import pandas as pd
from langgraph.graph import StateGraph, END

from app.services.dataset_service import get_dataset_dataframe, get_dataset_by_id
from app.agents.tools import (
    tool_query_dataset,
    tool_column_statistics,
    tool_correlations,
    tool_distributions,
    tool_train_model,
)

logger = logging.getLogger(__name__)

AGENT_PERSONAS = {
    "data_analyst": {
        "title": "Senior Data Analyst",
        "description": "Specializes in exploratory analysis, descriptive statistics, correlations, and distribution profiling.",
        "style": "Empirical, precise, and visual-first.",
    },
    "ml_engineer": {
        "title": "Machine Learning Engineer",
        "description": "Specializes in feature importance, target prediction, baseline benchmarking, and model performance.",
        "style": "Benchmark-driven, metric-oriented, and focused on generalization.",
    },
    "data_quality_auditor": {
        "title": "Data Quality Auditor",
        "description": "Specializes in data hygiene, null detection, skewness, outliers, and schema validation.",
        "style": "Critical, thorough, and focused on data reliability.",
    },
    "executive_advisor": {
        "title": "Strategic Intelligence Advisor",
        "description": "Synthesizes data science findings into executive briefings, strategic recommendations, and KPIs.",
        "style": "Executive, actionable, and focused on business value.",
    },
}


class AgentGraphState(TypedDict):
    message: str
    dataset_id: Optional[str]
    agent_role: str
    api_key: Optional[str]
    current_tool: Optional[str]
    tool_input: Optional[Dict[str, Any]]
    tool_output: Optional[Dict[str, Any]]
    tool_events: List[Dict[str, Any]]
    final_response: str
    data_payload: Optional[Dict[str, Any]]


def plan_node(state: AgentGraphState) -> Dict[str, Any]:
    """LangGraph node: Analyzes intent and coordinates the appropriate tool."""
    message = state["message"].lower()
    dataset_id = state.get("dataset_id")
    agent_role = state.get("agent_role", "data_analyst")
    df = get_dataset_dataframe(dataset_id) if dataset_id else None

    tool_events = list(state.get("tool_events", []))

    if df is None:
        return {
            "current_tool": "none",
            "tool_input": {},
            "tool_output": {"error": "No active dataset bound"},
            "tool_events": tool_events,
        }

    numeric_cols = list(df.select_dtypes(include=["number"]).columns)
    all_cols = list(df.columns)

    is_ml = any(w in message for w in ["predict", "train", "model", "target", "machine learning", "classify", "forecast", "importance"])
    is_corr = any(w in message for w in ["corr", "correlation", "relationship", "relation", "dependency"])
    is_outlier = any(w in message for w in ["outlier", "distribution", "dist", "skew", "spread", "histogram", "anomaly"])
    is_quality = any(w in message for w in ["quality", "missing", "null", "clean", "duplicate", "hygiene", "audit"])

    if is_ml or agent_role == "ml_engineer":
        target = None
        for col in all_cols:
            if col.lower() in message:
                target = col
                break
        if not target:
            target = all_cols[-1]

        tool_input = {"dataset_id": dataset_id, "target_column": target}
        tool_events.append({
            "step": 1,
            "type": "tool_call",
            "title": f"LangGraph Tool Action: tool_train_model",
            "content": f"Invoking automated model training pipeline targeting column '{target}'.",
            "tool": "tool_train_model",
            "args": tool_input,
        })
        return {
            "current_tool": "tool_train_model",
            "tool_input": tool_input,
            "tool_events": tool_events,
        }

    elif is_corr or (agent_role == "data_analyst" and len(numeric_cols) >= 2 and not is_outlier and not is_quality):
        tool_input = {"dataset_id": dataset_id}
        tool_events.append({
            "step": 1,
            "type": "tool_call",
            "title": f"LangGraph Tool Action: tool_correlations",
            "content": f"Computing pairwise Pearson linear correlation coefficients across {len(numeric_cols)} numeric features.",
            "tool": "tool_correlations",
            "args": tool_input,
        })
        return {
            "current_tool": "tool_correlations",
            "tool_input": tool_input,
            "tool_events": tool_events,
        }

    elif is_outlier:
        focus_col = numeric_cols[0] if numeric_cols else all_cols[0]
        for c in numeric_cols:
            if c.lower() in message:
                focus_col = c
                break
        tool_input = {"dataset_id": dataset_id, "focus_col": focus_col}
        tool_events.append({
            "step": 1,
            "type": "tool_call",
            "title": f"LangGraph Tool Action: tool_distributions",
            "content": f"Executing Tukey IQR outlier calculation and histogram binning for feature '{focus_col}'.",
            "tool": "tool_distributions",
            "args": tool_input,
        })
        return {
            "current_tool": "tool_distributions",
            "tool_input": tool_input,
            "tool_events": tool_events,
        }

    elif is_quality or agent_role == "data_quality_auditor":
        tool_input = {"dataset_id": dataset_id}
        tool_events.append({
            "step": 1,
            "type": "tool_call",
            "title": "LangGraph Tool Action: data_quality_scan",
            "content": "Running data hygiene scan for null cells, duplicate records, and schema completeness.",
            "tool": "data_quality_scan",
            "args": tool_input,
        })
        return {
            "current_tool": "data_quality_scan",
            "tool_input": tool_input,
            "tool_events": tool_events,
        }

    else:
        tool_input = {"dataset_id": dataset_id, "limit": 5}
        tool_events.append({
            "step": 1,
            "type": "tool_call",
            "title": "LangGraph Tool Action: tool_query_dataset",
            "content": f"Querying dataset schema and preview observations.",
            "tool": "tool_query_dataset",
            "args": tool_input,
        })
        return {
            "current_tool": "tool_query_dataset",
            "tool_input": tool_input,
            "tool_events": tool_events,
        }


def call_external_llm_if_available(prompt: str, system_prompt: str, user_api_key: Optional[str] = None) -> Optional[str]:
    """
    Attempts to call OpenAI, Anthropic, or Gemini if configured.
    Falls back gracefully if not configured or in case of network error.
    """
    openai_key = user_api_key or os.getenv("OPENAI_API_KEY")
    anthropic_key = user_api_key or os.getenv("ANTHROPIC_API_KEY")
    gemini_key = user_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    # 1. Try OpenAI
    if openai_key and (openai_key.startswith("sk-") or "openai" in (openai_key or "").lower()):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=900,
                temperature=0.3,
            )
            if completion.choices and completion.choices[0].message.content:
                return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.info(f"OpenAI completion fallback: {e}")

    # 2. Try Anthropic
    if anthropic_key and "sk-ant" in (anthropic_key or ""):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            resp = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=900,
            )
            if resp.content and resp.content[0].text:
                return resp.content[0].text.strip()
        except Exception as e:
            logger.info(f"Anthropic completion fallback: {e}")

    # 3. Try Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            g_resp = model.generate_content(f"{system_prompt}\n\nTask:\n{prompt}")
            if g_resp.text:
                return g_resp.text.strip()
        except Exception as e:
            logger.info(f"Gemini completion fallback: {e}")

    return None


def tool_execution_node(state: AgentGraphState) -> Dict[str, Any]:
    """LangGraph node: Executes the selected backend tool with genuine data and metrics tracking."""
    tool_name = state.get("current_tool")
    tool_input = state.get("tool_input") or {}
    dataset_id = state.get("dataset_id")
    tool_events = list(state.get("tool_events", []))

    if not dataset_id or tool_name == "none":
        return {
            "tool_output": {},
            "tool_events": tool_events,
        }

    df = get_dataset_dataframe(dataset_id)
    tool_output = {}
    start_time = time.perf_counter()

    try:
        if tool_name == "tool_train_model":
            target = tool_input.get("target_column")
            ml_res = tool_train_model(dataset_id, target)
            exec_ms = round((time.perf_counter() - start_time) * 1000, 1)
            tool_output = ml_res
            tool_events.append({
                "step": 2,
                "type": "observation",
                "title": "Tool Execution Result: Model Benchmark",
                "content": f"Evaluated candidate algorithms for task '{ml_res.get('problem_type')}'. Selected best model: '{ml_res.get('best_model')}' with test metric {ml_res.get('best_model_metrics', {}).get('primary_metric', 0.0)}.",
                "tool": tool_name,
                "execution_time_ms": exec_ms,
                "status": "success",
            })

        elif tool_name == "tool_correlations":
            corr_res = tool_correlations(dataset_id)
            exec_ms = round((time.perf_counter() - start_time) * 1000, 1)
            tool_output = corr_res
            cols = corr_res.get("columns", [])
            top_pairs = []
            if "pearson" in corr_res:
                for i, row in enumerate(corr_res["pearson"]):
                    for j in range(i + 1, len(row["values"])):
                        val = row["values"][j]
                        top_pairs.append((cols[i], cols[j], val, abs(val)))
                top_pairs.sort(key=lambda x: x[3], reverse=True)

            tool_events.append({
                "step": 2,
                "type": "observation",
                "title": "Tool Execution Result: Correlations",
                "content": f"Calculated {len(top_pairs)} pairwise Pearson correlations. Top relationship: '{top_pairs[0][0]}' & '{top_pairs[0][1]}' (r = {top_pairs[0][2]})." if top_pairs else "Calculated correlation matrix.",
                "tool": tool_name,
                "execution_time_ms": exec_ms,
                "status": "success",
            })

        elif tool_name == "tool_distributions":
            focus_col = tool_input.get("focus_col")
            dists = tool_distributions(dataset_id)
            exec_ms = round((time.perf_counter() - start_time) * 1000, 1)
            tool_output = dists
            target_dist = dists.get(focus_col, {})
            tool_events.append({
                "step": 2,
                "type": "observation",
                "title": f"Tool Execution Result: Distribution & Outliers for {focus_col}",
                "content": f"Median: {target_dist.get('median')}, Range: [{target_dist.get('min')}, {target_dist.get('max')}], Outlier count: {target_dist.get('outlier_count')} ({target_dist.get('outlier_percentage')}%).",
                "tool": tool_name,
                "execution_time_ms": exec_ms,
                "status": "success",
            })

        elif tool_name == "data_quality_scan":
            null_counts = {col: int(df[col].isnull().sum()) for col in df.columns if df[col].isnull().sum() > 0}
            dupes = int(df.duplicated().sum())
            exec_ms = round((time.perf_counter() - start_time) * 1000, 1)
            tool_output = {"null_counts": null_counts, "duplicates": dupes, "total_rows": len(df)}
            tool_events.append({
                "step": 2,
                "type": "observation",
                "title": "Tool Execution Result: Data Quality Audit",
                "content": f"Audited {len(df)} records. Found {dupes} duplicate rows and {len(null_counts)} columns with missing cells.",
                "tool": tool_name,
                "execution_time_ms": exec_ms,
                "status": "success",
            })

        elif tool_name == "tool_query_dataset":
            sample = tool_query_dataset(dataset_id, limit=tool_input.get("limit", 5))
            exec_ms = round((time.perf_counter() - start_time) * 1000, 1)
            tool_output = sample
            tool_events.append({
                "step": 2,
                "type": "observation",
                "title": "Tool Execution Result: Dataset Preview",
                "content": f"Retrieved {sample.get('returned_rows')} sample observations across {len(sample.get('columns', []))} columns.",
                "tool": tool_name,
                "execution_time_ms": exec_ms,
                "status": "success",
            })

    except Exception as e:
        exec_ms = round((time.perf_counter() - start_time) * 1000, 1)
        tool_output = {"error": str(e)}
        tool_events.append({
            "step": 2,
            "type": "observation",
            "title": f"Tool Execution Result: {tool_name} Failed",
            "content": f"Execution encountered an error: {str(e)}",
            "tool": tool_name,
            "execution_time_ms": exec_ms,
            "status": "failed",
        })

    return {
        "tool_output": tool_output,
        "tool_events": tool_events,
    }


def synthesis_node(state: AgentGraphState) -> Dict[str, Any]:
    """LangGraph node: Synthesizes final response and visualization payload from tool output."""
    agent_role = state.get("agent_role", "data_analyst")
    role_info = AGENT_PERSONAS.get(agent_role, AGENT_PERSONAS["data_analyst"])
    tool_name = state.get("current_tool")
    tool_output = state.get("tool_output") or {}
    dataset_id = state.get("dataset_id")
    dataset_meta = get_dataset_by_id(dataset_id) if dataset_id else None
    df = get_dataset_dataframe(dataset_id) if dataset_id else None

    tool_events = list(state.get("tool_events", []))
    data_payload: Optional[Dict[str, Any]] = None
    final_response = ""

    if df is None:
        final_response = (
            f"### {role_info['title']} Briefing\n\n"
            f"Please select or upload a dataset in **Dataset Studio** to activate full analytical tool coordination.\n\n"
            f"**Available Capabilities:**\n"
            f"- **Data Analyst**: Correlation matrices, distribution breakdowns, statistical summaries.\n"
            f"- **ML Engineer**: Target column modeling, benchmark leaderboards, feature importance.\n"
            f"- **Data Quality Auditor**: Null values, outliers, duplicate checks.\n"
            f"- **Strategic Advisor**: Executive summaries and strategic takeaways."
        )
        return {
            "final_response": final_response,
            "data_payload": None,
            "tool_events": tool_events,
        }

    if tool_name == "tool_train_model":
        target = state.get("tool_input", {}).get("target_column")
        ml_res = tool_output
        leaderboard_rows = "\n".join([
            f"| {m['model_name']} | {m.get('cv_score', 0):.4f} | {m.get('primary_metric', 0):.4f} |"
            for m in ml_res.get("leaderboard", [])
        ])
        top_feat_str = ", ".join([f"**{f['feature']}** ({f['normalized_pct']}%)" for f in ml_res.get("top_features", [])[:4]])

        final_response = (
            f"### {role_info['title']} - Predictive Modeling Benchmark\n\n"
            f"Trained and evaluated candidate algorithms targeting **`{target}`** (detected problem type: `{ml_res.get('problem_type')}`).\n\n"
            f"#### Leaderboard Summary\n"
            f"| Model | CV Score (Mean) | Test Metric |\n"
            f"|---|---|---|\n"
            f"{leaderboard_rows}\n\n"
            f"**Best Performer**: `{ml_res.get('best_model')}`\n\n"
            f"**Key Feature Drivers**: {top_feat_str if top_feat_str else 'N/A'}\n\n"
            f"**Engineering Recommendation**: Deploy `{ml_res.get('best_model')}` with regular monitoring for data drift on top feature inputs."
        )

        data_payload = {
            "type": "chart",
            "chart_type": "bar",
            "title": f"Feature Importance for {target}",
            "data": [
                {"name": f["feature"], "importance": f["normalized_pct"]}
                for f in ml_res.get("top_features", [])[:6]
            ],
            "x_key": "name",
            "y_key": "importance",
        }

    elif tool_name == "tool_correlations":
        cols = tool_output.get("columns", [])
        top_pairs = []
        if "pearson" in tool_output:
            for i, row in enumerate(tool_output["pearson"]):
                for j in range(i + 1, len(row["values"])):
                    val = row["values"][j]
                    top_pairs.append((cols[i], cols[j], val, abs(val)))
            top_pairs.sort(key=lambda x: x[3], reverse=True)

        pairs_md = "\n".join([
            f"- **`{p[0]}`** & **`{p[1]}`**: `r = {p[2]}` ({'Strong positive' if p[2] > 0.6 else 'Strong negative' if p[2] < -0.6 else 'Moderate/Weak'})"
            for p in top_pairs[:5]
        ])

        final_response = (
            f"### {role_info['title']} - Correlation Analysis\n\n"
            f"Inspected linear dependencies across **{len(cols)} numeric columns** in the dataset.\n\n"
            f"#### Strongest Feature Relationships:\n"
            f"{pairs_md}\n\n"
            f"**Analytical Takeaway**: Features with correlations above 0.85 should be monitored for multicollinearity before regression modeling."
        )

        if top_pairs:
            data_payload = {
                "type": "chart",
                "chart_type": "bar",
                "title": "Top Pairwise Feature Correlations",
                "data": [
                    {"name": f"{p[0]} ~ {p[1]}", "correlation": p[2]}
                    for p in top_pairs[:6]
                ],
                "x_key": "name",
                "y_key": "correlation",
            }

    elif tool_name == "tool_distributions":
        focus_col = state.get("tool_input", {}).get("focus_col")
        target_dist = tool_output.get(focus_col, {})
        bins = target_dist.get("bins", [])

        final_response = (
            f"### {role_info['title']} - Distribution & Outlier Profiling\n\n"
            f"Analyzed feature **`{focus_col}`**:\n\n"
            f"- **Median**: `{target_dist.get('median')}`\n"
            f"- **Spread**: Range `{target_dist.get('min')}` to `{target_dist.get('max')}`\n"
            f"- **Anomalies / Outliers**: **{target_dist.get('outlier_count')} rows** ({target_dist.get('outlier_percentage')}% of total dataset)\n\n"
            f"**Data Recommendation**: {'Outlier concentration exceeds 3% - consider IQR clipping or RobustScaler.' if target_dist.get('outlier_percentage', 0) > 3 else 'Distribution exhibits healthy concentration within IQR limits.'}"
        )

        data_payload = {
            "type": "chart",
            "chart_type": "bar",
            "title": f"Frequency Distribution: {focus_col}",
            "data": [{"range": b["range"], "count": b["count"]} for b in bins],
            "x_key": "range",
            "y_key": "count",
        }

    elif tool_name == "data_quality_scan":
        null_counts = tool_output.get("null_counts", {})
        dupes = tool_output.get("duplicates", 0)
        total_rows = tool_output.get("total_rows", len(df))

        null_list = "\n".join([f"- **`{col}`**: `{cnt}` missing ({round(cnt/total_rows*100, 1)}%)" for col, cnt in null_counts.items()]) if null_counts else "- No missing values detected across any column."

        final_response = (
            f"### {role_info['title']} - Health & Hygiene Audit\n\n"
            f"Completed verification of **{total_rows:,} rows and {len(df.columns)} columns**.\n\n"
            f"#### Findings Checklist:\n"
            f"- **Duplicate Rows**: `{dupes}`\n"
            f"- **Missing Value Profile**:\n{null_list}\n\n"
            f"**Quality Score**: `{'98/100 (Optimal)' if not null_counts and dupes == 0 else '84/100 (Minor cleaning advised)' if dupes < 10 else '68/100 (Action required)'}`\n\n"
            f"**Remediation Suggestion**: Utilize **Auto EDA Clean Tab** to apply median imputation and drop duplicate records."
        )

        data_payload = {
            "type": "chart",
            "chart_type": "bar",
            "title": "Missing Values by Column",
            "data": [{"column": col, "missing": cnt} for col, cnt in list(null_counts.items())[:8]] or [{"column": "All Columns", "missing": 0}],
            "x_key": "column",
            "y_key": "missing",
        }

    else:
        sample = tool_output
        final_response = (
            f"### {role_info['title']} - Dataset Synthesis\n\n"
            f"Dataset **`{dataset_meta.filename if dataset_meta else 'Active Dataset'}`** contains **{len(df):,} records** and **{len(df.columns)} attributes**.\n\n"
            f"#### Attributes:\n"
            f"- **Columns**: {', '.join([f'`{c}`' for c in list(df.columns)[:8]])}\n\n"
            f"**Suggested Next Actions**:\n"
            f"1. Ask me to *'Analyze correlations with {list(df.columns)[0]}'* to view linear dependencies\n"
            f"2. Ask me to *'Train predictive model targeting {list(df.columns)[-1]}'* to benchmark algorithms\n"
            f"3. Ask me to *'Audit data quality and missing values'*"
        )

        data_payload = {
            "type": "table",
            "title": "Dataset Preview",
            "columns": sample.get("columns", [])[:6],
            "data": sample.get("data", [])[:5],
        }

    # Dynamic LLM invocation if an API key (OpenAI, Anthropic, Gemini) is present
    api_key = state.get("api_key")
    if api_key or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        prompt = (
            f"User Inquiry: {state['message']}\n\n"
            f"Dataset Context: {dataset_meta.filename if dataset_meta else 'Active Dataset'}\n"
            f"Tool Executed: {tool_name}\n"
            f"Observation Summary: {json.dumps(tool_output, default=str)[:1200]}\n\n"
            f"Empirical Baseline Report:\n{final_response}\n\n"
            f"Please deliver an enhanced, professional analysis synthesizing these findings with concrete next steps."
        )
        system_prompt = (
            f"You are the {role_info['title']} on InsightForge AI. "
            f"Persona Style: {role_info['style']}. "
            f"Provide insightful, highly actionable Markdown analysis based strictly on the factual dataset observations."
        )
        llm_enhanced = call_external_llm_if_available(prompt, system_prompt, api_key)
        if llm_enhanced:
            final_response = llm_enhanced

    return {
        "final_response": final_response,
        "data_payload": data_payload,
        "tool_events": tool_events,
    }


def create_agent_graph() -> Any:
    """Builds and compiles the LangGraph StateGraph workflow."""
    workflow = StateGraph(AgentGraphState)

    workflow.add_node("plan", plan_node)
    workflow.add_node("execute_tool", tool_execution_node)
    workflow.add_node("synthesize", synthesis_node)

    workflow.set_entry_point("plan")
    workflow.add_edge("plan", "execute_tool")
    workflow.add_edge("execute_tool", "synthesize")
    workflow.add_edge("synthesize", END)

    return workflow.compile()


# Compile global LangGraph instance
AGENT_GRAPH = create_agent_graph()


class AgentEngine:
    """LangGraph-coordinated autonomous multi-agent execution engine."""

    @staticmethod
    def run_agent(
        message: str,
        dataset_id: Optional[str] = None,
        agent_role: str = "data_analyst",
        api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        initial_state: AgentGraphState = {
            "message": message,
            "dataset_id": dataset_id,
            "agent_role": agent_role,
            "api_key": api_key,
            "current_tool": None,
            "tool_input": None,
            "tool_output": None,
            "tool_events": [],
            "final_response": "",
            "data_payload": None,
        }

        # Execute the compiled LangGraph workflow
        final_state = AGENT_GRAPH.invoke(initial_state)

        return {
            "role": agent_role,
            "reasoning_steps": final_state["tool_events"],
            "final_response": final_state["final_response"],
            "data_payload": final_state.get("data_payload"),
        }
