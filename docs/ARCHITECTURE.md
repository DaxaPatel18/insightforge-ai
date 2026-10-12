# InsightForge AI — Architecture & Specification

**Tagline**: *Turn Data Into Intelligence.*  
**Product**: Agentic Data Science & Machine Learning Platform.

---

## 1. System Overview

InsightForge AI is built with a decoupled modern architecture designed for enterprise-grade scalability, modular machine learning workflows, responsive agent interactions, and publication-ready report synthesis.

```
                    ┌─────────────────────────────────┐
                    │     Frontend (Vite / React 19)  │
                    │   TypeScript + Tailwind + Recharts│
                    └───────────────┬─────────────────┘
                                    │ HTTP / REST (Axios-free typed client)
                                    ▼
                    ┌─────────────────────────────────┐
                    │      Backend (FastAPI 0.110+)   │
                    │   CORS Enabled / Uvicorn Server │
                    └───────┬───────┬───────┬─────────┘
                            │       │       │
            ┌───────────────▼─┐   ┌─▼─────┐ ┌▼──────────────┐
            │ Dataset Service │   │ ML Lab│ │ AI Agent Core │
            │  Pandas, NumPy  │   │XGBoost│ │   LangGraph   │
            └────────┬────────┘   │  SHAP │ └───────┬───────┘
                     │            └───┬───┘         │
                     ▼                ▼             ▼
            ┌───────────────────────────────────────────────┐
            │        Knowledge RAG & Executive Reports      │
            │      PyMuPDF / Cosine Search / ReportLab      │
            └───────────────────────┬───────────────────────┘
                                    ▼
            ┌───────────────────────────────────────────────┐
            │          Persistence: SQLAlchemy + SQLite     │
            │  Datasets, Experiments, Sessions, Reports     │
            └───────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
InsightForge AI/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Sidebar, TopNav, Layout
│   │   ├── context/              # ThemeContext (Light / Dark mode)
│   │   ├── pages/                # Route pages (Overview, DatasetStudio, AutoEDA,
│   │   │                         # MLLab, AgentStudio, KnowledgeRAG, Reports, Settings)
│   │   ├── lib/api.ts            # Typed REST API client & interfaces
│   │   ├── App.tsx               # Main routing & layout
│   │   └── main.tsx              # Application entrypoint
│   └── package.json
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── api/                  # API routers (datasets, eda, ml, agents, rag, reports, evaluations)
│   │   ├── services/             # Analytical logic (dataset profiling, EDA, reporting)
│   │   ├── ml/                   # Machine learning core (XGBoost, RF, GBDT, SHAP)
│   │   ├── agents/               # Autonomous agents (LangGraph multi-step reasoning)
│   │   ├── rag/                  # Document & metadata RAG engine (PyMuPDF, semantic retrieval)
│   │   ├── db/                   # SQLAlchemy models, engine, and session management
│   │   └── main.py               # FastAPI entrypoint, lifespan, CORS & health check
│   ├── audit_test_suite.py       # Comprehensive 16-test technical audit suite
│   ├── audit_results.json        # Technical audit output records
│   └── requirements.txt
├── datasets/
│   └── sample/                   # Sample datasets for verification
├── docs/                         # Technical documentation & architectural specifications
├── .gitignore
└── README.md
```

---

## 3. Operational Milestones & Verification

All phases have been implemented and verified via automated end-to-end technical audits (`audit_test_suite.py`):

1. **Dataset Studio (Core Data Pipeline)**:
   - Multipart file streaming and validation for CSV and Excel (`.xlsx`, `.xls`).
   - Automated schema inference, missing value percentages, and semantic classification.
   - Database persistence with relational cascades.

2. **Automated EDA (Exploratory Data Analysis)**:
   - Pearson and Spearman pairwise correlation matrices.
   - Tukey IQR outlier calculation with dynamic upper and lower thresholds.
   - Equal-width binning for numeric distribution histograms.
   - Automated data hygiene rules (high missing, high cardinality, duplicate checks).
   - Non-destructive data cleaning toolkit (imputation, dropping duplicates, log transforms).

3. **Machine Learning Laboratory (Predictive Analytics)**:
   - Automated task detection (Classification vs. Regression).
   - Leakage-free `ColumnTransformer` pipelines with median/mode imputation and One-Hot Encoding.
   - Multi-model evaluation suite: XGBoost, Random Forest, Gradient Boosting, Logistic Regression / Ridge.
   - K-Fold cross-validation stability tracking.
   - Model explainability with global TreeSHAP and individual sample feature attributions.

4. **Agentic AI Studio (Autonomous Reasoning)**:
   - LangGraph `StateGraph` coordinator with ReAct reasoning traces.
   - Specialized agent personas: General Analyst, Machine Learning Engineer, Data Cleaner, Domain Researcher.
   - Sandboxed Python data transformation tools and automated visualization synthesis.

5. **Knowledge RAG & Executive Reporting**:
   - PyMuPDF text and metadata extraction from uploaded documentation.
   - Sliding-window text chunking with cosine semantic similarity ranking.
   - Grounded citations with confidence scores.
   - ReportLab automated PDF synthesis with KPI summaries, model benchmark tables, and executive takeaways.
