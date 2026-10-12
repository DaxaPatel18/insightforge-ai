import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from app.services.dataset_service import get_dataset_dataframe
from app.services.eda_service import calculate_correlations, calculate_distributions_and_outliers
from app.ml.engine import train_and_evaluate_pipeline



import re

ALLOWED_OPERATORS = {"==", "!=", ">", "<", ">=", "<=", "contains", "in"}


def parse_safe_filter_clause(clause: str, available_columns: List[str]) -> Optional[Dict[str, Any]]:
    """
    Parses a single filter clause into structured components: column, operator, value.
    Rejects any un-allowlisted tokens, expressions, attributes, or arbitrary code.
    """
    pattern = r"^\s*([a-zA-Z0-9_]+)\s*(==|!=|>=|<=|>|<|contains|in)\s*(.+?)\s*$"
    match = re.match(pattern, clause.strip(), re.IGNORECASE)
    if not match:
        return None

    col, op, raw_val = match.groups()
    op = op.lower()

    # Column allowlist verification
    if col not in available_columns:
        return None

    if op not in ALLOWED_OPERATORS:
        return None

    # Reject any dangerous injection characters or multi-statement tokens
    if any(char in raw_val for char in [";", "(", ")", "{", "}", "\\", "\n", "\r", "\x00", "__"]):
        return None

    # Parse literal value safely without eval()
    raw_val = raw_val.strip()
    if raw_val.startswith(("'", '"')) and raw_val.endswith(("'", '"')) and len(raw_val) >= 2:
        val = raw_val[1:-1]
        # Quoted string value
    elif raw_val.lower() == "true":
        val = True
    elif raw_val.lower() == "false":
        val = False
    elif raw_val.lower() in ("none", "null", "nan"):
        val = None
    elif op == "in":
        # Parse bracketed or comma-separated items safely
        cleaned = raw_val.strip("[]() ")
        parsed_items = []
        for v in cleaned.split(","):
            v = v.strip()
            if not v:
                continue
            if v.startswith(("'", '"')) and v.endswith(("'", '"')) and len(v) >= 2:
                parsed_items.append(v[1:-1])
            else:
                try:
                    parsed_items.append(float(v) if "." in v else int(v))
                except ValueError:
                    return None  # Unquoted non-numeric item is invalid
        val = parsed_items
    else:
        # Numeric literal strictly required if unquoted
        try:
            if "." in raw_val:
                val = float(raw_val)
            else:
                val = int(raw_val)
        except ValueError:
            # Unquoted strings are rejected to prevent unquoted expressions
            return None

    return {"column": col, "op": op, "value": val}


def apply_structured_filter(df: pd.DataFrame, filters: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Applies structured allowlisted filters strictly via Pandas boolean masks.
    Guarantees no arbitrary code execution and no Pandas df.query() eval.
    """
    sub_df = df
    for flt in filters:
        col = flt.get("column")
        op = flt.get("op")
        val = flt.get("value")

        if col not in sub_df.columns or op not in ALLOWED_OPERATORS:
            continue

        try:
            if op == "==":
                if val is None:
                    sub_df = sub_df[sub_df[col].isna()]
                else:
                    sub_df = sub_df[sub_df[col] == val]
            elif op == "!=":
                if val is None:
                    sub_df = sub_df[sub_df[col].notna()]
                else:
                    sub_df = sub_df[sub_df[col] != val]
            elif op == ">":
                numeric_series = pd.to_numeric(sub_df[col], errors="coerce")
                sub_df = sub_df[numeric_series > float(val)]
            elif op == "<":
                numeric_series = pd.to_numeric(sub_df[col], errors="coerce")
                sub_df = sub_df[numeric_series < float(val)]
            elif op == ">=":
                numeric_series = pd.to_numeric(sub_df[col], errors="coerce")
                sub_df = sub_df[numeric_series >= float(val)]
            elif op == "<=":
                numeric_series = pd.to_numeric(sub_df[col], errors="coerce")
                sub_df = sub_df[numeric_series <= float(val)]
            elif op == "contains":
                sub_df = sub_df[sub_df[col].astype(str).str.contains(str(val), case=False, na=False)]
            elif op == "in":
                items = val if isinstance(val, (list, tuple, set)) else [val]
                sub_df = sub_df[sub_df[col].isin(items)]
        except Exception:
            # Skip invalid clause execution without throwing
            continue

    return sub_df


def tool_query_dataset(
    dataset_id: str,
    query_str: Optional[str] = None,
    filters: Optional[List[Dict[str, Any]]] = None,
    columns: Optional[List[str]] = None,
    sort_by: Optional[str] = None,
    ascending: bool = True,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Filter, sort, and query rows from a dataset using an allowlisted structured query interface.
    df.query() and arbitrary expression execution are strictly prohibited.
    """
    df = get_dataset_dataframe(dataset_id)
    if df is None:
        return {"error": f"Dataset {dataset_id} not found."}

    sub_df = df.copy()
    available_cols = list(sub_df.columns)

    # Collect structured filters
    parsed_filters: List[Dict[str, Any]] = []

    # 1. Direct structured filters if provided
    if filters and isinstance(filters, list):
        for f in filters:
            if isinstance(f, dict) and f.get("column") in available_cols and f.get("op") in ALLOWED_OPERATORS:
                parsed_filters.append(f)

    # 2. Parse query_str into structured allowlisted filters (never passed to eval/df.query)
    if query_str and isinstance(query_str, str):
        clauses = re.split(r"\b(?:and|AND|&)\b", query_str)
        for clause in clauses:
            if clause.strip():
                parsed = parse_safe_filter_clause(clause, available_cols)
                if parsed:
                    parsed_filters.append(parsed)

    # Apply structured filtering
    if parsed_filters:
        sub_df = apply_structured_filter(sub_df, parsed_filters)

    # Column projection allowlist
    if columns:
        valid_cols = [c for c in columns if c in sub_df.columns]
        if valid_cols:
            sub_df = sub_df[valid_cols]

    # Safe sorting
    if sort_by and sort_by in sub_df.columns:
        sub_df = sub_df.sort_values(by=sort_by, ascending=ascending)

    # Enforce safe upper limit on returned preview rows
    bounded_limit = max(1, min(int(limit), 100))
    total_matching = len(sub_df)
    preview = sub_df.head(bounded_limit).replace({np.nan: None}).to_dict(orient="records")

    return {
        "total_matching_rows": total_matching,
        "returned_rows": len(preview),
        "applied_filters": parsed_filters,
        "columns": list(sub_df.columns),
        "data": preview,
    }


def tool_column_statistics(dataset_id: str, column: str) -> Dict[str, Any]:
    """Calculate detailed statistics for a specific column."""
    df = get_dataset_dataframe(dataset_id)
    if df is None or column not in df.columns:
        return {"error": f"Column '{column}' not found in dataset."}

    series = df[column]
    total_count = len(series)
    missing_count = int(series.isnull().sum())
    unique_count = int(series.nunique())

    if pd.api.types.is_numeric_dtype(series):
        clean_series = series.dropna()
        q25 = float(clean_series.quantile(0.25)) if not clean_series.empty else 0.0
        median = float(clean_series.median()) if not clean_series.empty else 0.0
        q75 = float(clean_series.quantile(0.75)) if not clean_series.empty else 0.0
        iqr = q75 - q25
        lower_bound = q25 - 1.5 * iqr
        upper_bound = q75 + 1.5 * iqr
        outliers = int(((clean_series < lower_bound) | (clean_series > upper_bound)).sum())

        return {
            "column": column,
            "type": "numeric",
            "total_count": total_count,
            "missing_count": missing_count,
            "missing_pct": round(missing_count / total_count * 100, 2) if total_count > 0 else 0,
            "unique_count": unique_count,
            "mean": round(float(clean_series.mean()), 4) if not clean_series.empty else None,
            "std": round(float(clean_series.std()), 4) if not clean_series.empty else None,
            "min": round(float(clean_series.min()), 4) if not clean_series.empty else None,
            "q25": round(q25, 4),
            "median": round(median, 4),
            "q75": round(q75, 4),
            "max": round(float(clean_series.max()), 4) if not clean_series.empty else None,
            "outlier_count": outliers,
        }
    else:
        top_counts = series.value_counts().head(5).to_dict()
        return {
            "column": column,
            "type": "categorical",
            "total_count": total_count,
            "missing_count": missing_count,
            "missing_pct": round(missing_count / total_count * 100, 2) if total_count > 0 else 0,
            "unique_count": unique_count,
            "top_categories": {str(k): int(v) for k, v in top_counts.items()},
        }


def tool_correlations(dataset_id: str) -> Dict[str, Any]:
    """Retrieve pairwise Pearson correlations for numeric features."""
    df = get_dataset_dataframe(dataset_id)
    if df is None:
        return {"error": f"Dataset {dataset_id} not found."}
    corr = calculate_correlations(df)
    if not corr or not corr.get("pearson"):
        return {"error": "Insufficient numeric columns for correlation analysis."}
    return {
        "columns": corr["columns"],
        "pearson": [
            {"column": row["column"], "values": [round(v, 3) for v in row["values"]]}
            for row in corr["pearson"]
        ],
    }


def tool_distributions(dataset_id: str) -> Dict[str, Any]:
    """Retrieve distribution histograms and outlier metrics for numeric features."""
    df = get_dataset_dataframe(dataset_id)
    if df is None:
        return {"error": f"Dataset {dataset_id} not found."}
    dists = calculate_distributions_and_outliers(df)
    summary = {}
    for col, metric in dists.items():
        summary[col] = {
            "min": metric["min"],
            "median": metric["median"],
            "max": metric["max"],
            "outlier_count": metric["outlier_count"],
            "outlier_percentage": metric["outlier_percentage"],
            "bins": metric["bins"][:6],  # compact bins for agent
        }
    return summary



def tool_train_model(dataset_id: str, target_column: str, problem_type: Optional[str] = None) -> Dict[str, Any]:
    """Train baseline machine learning models and return leaderboard score."""
    df = get_dataset_dataframe(dataset_id)
    if df is None:
        return {"error": f"Dataset {dataset_id} not found."}
    if target_column not in df.columns:
        return {"error": f"Target column '{target_column}' does not exist in dataset."}

    feature_cols = [c for c in df.columns if c != target_column]
    result = train_and_evaluate_pipeline(
        df=df,
        target_column=target_column,
        feature_columns=feature_cols,
        problem_type=problem_type,
    )
    return {
        "problem_type": result["problem_type"],
        "best_model": result["best_model"],
        "best_model_metrics": result["best_model_metrics"],
        "leaderboard": result["leaderboard"][:3],
        "top_features": result["feature_importance"][:5] if "feature_importance" in result else [],
    }
