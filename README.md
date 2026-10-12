# InsightForge AI

> **Agentic Data Science, Automated Machine Learning & Explainable AI Platform**  
> An extensible full-stack analytics workbench integrating automated exploratory data analysis (EDA), multi-model benchmarking with SHAP explainability, LangGraph-driven autonomous agents, retrieval-augmented generation (RAG), and executive PDF reporting.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Key Platform Modules](#key-platform-modules)
- [Technology Stack](#technology-stack)
- [Security & Multi-Tenant Isolation](#security--multi-tenant-isolation)
- [Local Development Setup](#local-development-setup)
- [Automated Testing & Quality Assurance](#automated-testing--quality-assurance)
- [Containerization & Deployment](#containerization--deployment)
- [Deployment Considerations & Technical Trade-offs](#deployment-considerations--technical-trade-offs)
- [Repository Structure](#repository-structure)
- [License](#license)

---

## Architectural Overview

InsightForge AI is architected as a decoupled system featuring a reactive TypeScript Single Page Application (SPA) paired with an asynchronous Python FastAPI service. The analytical engine provides zero-data-leakage preprocessing pipelines, multi-model cross-validation, explainability via SHAP, agentic reasoning graphs via LangGraph, and hybrid vector retrieval.

```
                              ┌──────────────────────────────────────────────┐
                              │            Client Browser (SPA)              │
                              │    React 19 • TypeScript • Tailwind CSS      │
                              │     Lucide Icons • Recharts Visualization    │
                              └──────────────────────┬───────────────────────┘
                                                     │ HTTP / REST & JWT Bearer
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │             FastAPI Gateway & API            │
                              │      Uvicorn ASGI • CORS • Rate Limits       │
                              │        Stateless HS256 Authentication        │
                              └───────┬──────────────┬──────────────┬────────┘
                                      │              │              │
           ┌──────────────────────────┘              │              └──────────────────────────┐
           ▼                                         ▼                                         ▼
┌─────────────────────────┐       ┌─────────────────────────────────┐       ┌─────────────────────────┐
│     Machine Learning    │       │        Agentic AI Engine        │       │      Knowledge RAG      │
│  • Scikit-Learn Pipeline│       │  • LangGraph StateGraph         │       │  • PyMuPDF (fitz) Parse │
│  • XGBoost / GBDT / RF  │       │  • Multi-Agent Personas         │       │  • Semantic Chunking    │
│  • K-Fold Cross-Val     │       │  • ReAct Dynamic Tool Execution │       │  • ChromaDB Vector Store│
│  • SHAP TreeExplainer   │       │  • Structured Visualization     │       │  • TF-IDF Hybrid Match  │
└──────────┬──────────────┘       └────────────────┬────────────────┘       └──────────┬──────────────┘
           │                                       │                                   │
           └──────────────────────────┐            │            ┌──────────────────────┘
                                      ▼            ▼            ▼
                              ┌──────────────────────────────────────────────┐
                              │            Data Persistence Tier             │
                              │   SQLAlchemy 2.0 ORM Engine & Connection Pool│
                              │   • PostgreSQL 16 (Multi-Node / Production)  │
                              │   • SQLite (Zero-Config Local Development)   │
                              │   • Isolated File Storage (/uploads, /data)  │
                              └──────────────────────────────────────────────┘
```

---

## Key Platform Modules

<!-- UI Preview Placeholders -->
> **UI Interface Walkthrough**  
> *Screenshots demonstrating the dark/light interface, analytical dashboards, and model telemetry.*
>
> | Dataset Studio | Automated EDA | Machine Learning Lab |
> | :---: | :---: | :---: |
> | `![Dataset Studio](docs/screenshots/dataset_studio.png)` | `![Automated EDA](docs/screenshots/auto_eda.png)` | `![ML Lab](docs/screenshots/ml_lab.png)` |
>
> | Agent Studio | Knowledge RAG | Executive PDF Report |
> | :---: | :---: | :---: |
> | `![Agent Studio](docs/screenshots/agent_studio.png)` | `![Knowledge RAG](docs/screenshots/rag_studio.png)` | `![Reports](docs/screenshots/reports.png)` |

### 1. Dataset Studio
- **Ingestion**: Supports tabular CSV and Excel (`.xlsx`, `.xls`) uploads up to 50 MB with MIME/extension allowlists and path traversal sanitization.
- **Profiling**: Automated schema detection, missing value distribution, duplicate record counts, memory footprint calculation, and summary statistics.
- **Data Hygiene**: Non-destructive transformations including missing value imputation, duplicate elimination, outlier filtering, and log transforms.

### 2. Automated Exploratory Data Analysis (EDA)
- **Correlation Matrices**: Pearson and Spearman rank correlation heatmaps with automated multicollinearity warnings ($|r| > 0.85$).
- **Distribution & Outliers**: Tukey IQR outlier bounds, distribution histograms with dynamic binning, and parametric skewness indicators.
- **Automated Insights**: Rule-based data hygiene heuristic engines generating actionable recommendations.

### 3. Machine Learning Lab
- **Problem Detection**: Automated classification vs. regression task detection based on target distribution characteristics.
- **Leakage-Free Preprocessing**: Scikit-Learn `ColumnTransformer` pipelines maintaining strict train/test isolation during cross-validation.
- **Model Leaderboards**: Benchmarking across XGBoost, Random Forest, Gradient Boosting, Ridge, and Logistic Regression with metric ranking (F1, Precision, Recall, ROC-AUC, RMSE, MAE, $R^2$).
- **Explainable AI (SHAP)**: Global feature importance bar charts and localized instance force-plot values generated via `shap.TreeExplainer`.

### 4. Autonomous Agent Studio
- **LangGraph Coordination**: Multi-turn cyclical state machine graphs executing ReAct loops (Reasoning + Acting).
- **Specialized Personas**: Configurable roles (Data Analyst, ML Engineer, Data Cleaner, Methodology Researcher).
- **Safe Sandboxed Tools**: Schema inspection, statistical summary, safe filtered querying without `eval()` or arbitrary SQL execution, and dynamic chart payload synthesis.
- **Fallback Capability**: Operates using rule-based analytical heuristics if external LLM API keys are omitted.

### 5. Knowledge RAG (Retrieval-Augmented Generation)
- **Document Parsing**: Text extraction across PDF (`PyMuPDF`), Markdown, Plain Text, and CSV files.
- **Chunking Engine**: Semantic chunking preserving page metadata and section boundaries.
- **Hybrid Retrieval**: Dense vector search via persistent ChromaDB coupled with TF-IDF cosine similarity scoring.
- **Grounded Citations**: Source document attribution and confidence score indicators for audited query responses.

### 6. Executive Report Synthesis
- **Automated Compilation**: Assembles dataset profiles, transformation logs, ML benchmark metrics, and SHAP importances into executive summaries.
- **ReportLab PDF Generation**: Generates downloadable, publication-ready PDF documents with KPI badges, styled data tables, and metadata.
- **Access Control**: Authenticated streaming via standard `Authorization: Bearer <JWT>` headers, prohibiting query string token leakage.

---

## Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/), [TypeScript 5.x](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS 3.4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), Custom Dark/Light theme system |
| **Data Visualization** | [Recharts](https://recharts.org/), Responsive SVG analytical dashboards |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), ASGI, Starlette |
| **Database & ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [Alembic](https://alembic.sqlalchemy.org/), PostgreSQL 16, SQLite |
| **Machine Learning** | [Scikit-Learn](https://scikit-learn.org/), [XGBoost](https://xgboost.readthedocs.io/), [SHAP](https://shap.readthedocs.io/), [Pandas](https://pandas.pydata.org/), [NumPy](https://numpy.org/) |
| **Agentic Framework** | [LangGraph](https://langchain-ai.github.io/langgraph/), [LangChain Core](https://python.langchain.com/) |
| **RAG & Document Processing**| [PyMuPDF](https://pymupdf.readthedocs.io/), [ChromaDB](https://www.trychroma.com/), Scikit-Learn TF-IDF |
| **Report Generation** | [ReportLab](https://www.reportlab.com/) |
| **Orchestration & Tooling** | [Docker Compose](https://docs.docker.com/compose/), Nginx, Node.js Concurrently |

---

## Security & Multi-Tenant Isolation

1. **Stateless Authentication**:
   - Industry-standard `HS256` signed JWT tokens with constant-time verification.
   - Algorithms strictly constrained (`none` algorithm attacks explicitly rejected).
   - In production (`ENVIRONMENT=production`), the application refuses to launch without a high-entropy secret ($\ge 32$ characters).
2. **Multi-Tenant Resource Isolation**:
   - Strict `user_id` foreign key validation on every dataset, transformation, ML experiment, RAG document, and PDF report.
   - Unauthorized cross-user access attempts return `HTTP 404 Not Found` rather than leaking resource existence.
3. **Input Sanitization & Injection Defense**:
   - Upload filenames are normalized and stripped of path traversal characters (`..`, `/`, `\`).
   - File extensions are validated against strict allowlists (`.csv`, `.xlsx`, `.pdf`, `.txt`, `.md`).
   - Agent tool queries parse benign comparison tokens into structured primitives, avoiding `eval()`, `exec()`, or dynamic raw SQL string interpolation.
4. **GDPR / Privacy Compliance**:
   - Dedicated Data Subject Access Request (DSAR) intake endpoints.
   - Independent multi-tier deletion cascades that simultaneously purge SQLite/PostgreSQL relational rows, physical disk files, and vector database embeddings.
5. **Network Hardening**:
   - Docker PostgreSQL exposure bound strictly to localhost loopback (`127.0.0.1`) by default.
   - Backend APIs isolated behind internal Docker bridge networks; public ingress routed through Nginx.

---

## Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0+ (Tested on Node v20/v24)
- **Python**: v3.11.0+ (Tested on Python 3.11.9)
- **Git**

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/insightforge-ai.git
   cd insightforge-ai
   ```

2. **Install Frontend & Orchestration Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Python Virtual Environment**:
   ```bash
   # From project root
   cd backend
   python -m venv .venv

   # Activate virtual environment
   # Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # macOS / Linux:
   source .venv/bin/activate

   # Install dependencies
   pip install --upgrade pip
   pip install -r requirements.txt
   cd ..
   ```

4. **Environment Configuration**:
   ```bash
   # Copy development environment template
   cp .env.example .env
   ```
   *Note: In local development, the platform automatically initializes SQLite (`backend/insightforge.db`) and local development keys without requiring additional configuration.*

5. **Start Unified Development Server**:
   ```bash
   npm run dev
   ```
   - **Frontend Application**: [http://localhost:5173](http://localhost:5173)
   - **FastAPI Interactive Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **Backend Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

   *To safely shut down background services, press `Ctrl+C` or execute `node scripts/stop.mjs`.*

---

## Automated Testing & Quality Assurance

The codebase includes comprehensive automated test suites covering authentication, resource isolation, machine learning pipelines, security controls, and production build viability.

### 1. Build Verification
Validates TypeScript compilation and Vite minified production bundling:
```bash
npm run build
```

### 2. End-to-End Authentication & Isolation Suite
Executes 25 comprehensive verification tests (registration, login, token tampering, algorithm attacks, and cross-user data/report isolation):
```bash
npm run test:auth
```

### 3. Technical Audit Suite
Executes 17 comprehensive platform audit tests (health, CSV/Excel parsing, EDA calculations, ML benchmarks, SHAP explanations, LangGraph agents, RAG, and ReportLab PDF streaming):
```bash
npm run test:audit
```

### 4. Targeted Security Controls & Traversal Verification
Validates input sanitization, extension allowlisting, structured filter parsers, and multi-tier data deletion:
```bash
node scripts/test-backend.mjs verify_security_controls.py
```

### 5. PostgreSQL Readiness & Alembic Migration Tests
Tests database driver compatibility, connection pool normalization, and Alembic migrations:
```bash
node scripts/test-backend.mjs test_postgres_readiness.py
```

---

## Containerization & Deployment

InsightForge AI includes production-configured Docker assets for containerized deployment with PostgreSQL and Nginx.

```bash
# 1. Prepare production configuration
cp .env.production.example .env

# Generate a strong 64-character secret and set in .env:
# openssl rand -hex 32
# Configure POSTGRES_PASSWORD in .env

# 2. Build and launch all container services
docker compose up -d --build

# 3. Verify container health
docker compose ps
```

Services instantiated:
- `insightforge_postgres`: PostgreSQL 16 database isolated on an internal bridge network.
- `insightforge-backend`: FastAPI application service with health check probes.
- `insightforge_frontend`: Nginx reverse-proxy serving the compiled SPA and proxying API traffic.

---

## Deployment Considerations & Technical Trade-offs

1. **Embedded ChromaDB Concurrency**:
   - The default configuration uses embedded ChromaDB with SQLite disk storage. Embedded SQLite relies on database-level file locks.
   - For single-node container deployments, `BACKEND_WORKERS=1` is recommended to prevent multi-process SQLite lock contention during simultaneous write operations.
   - For horizontal scaling across multiple replicas (`--scale backend=N`) or high-concurrency clusters, configure an external ChromaDB service (`CHROMA_SERVER_HOST=chroma.internal`) or standalone vector database. The backend automatically switches to `chromadb.HttpClient`.
2. **External LLM Provider API Keys**:
   - The AI Agent and RAG modules operate with autonomous rule-based analytical heuristics if external LLM credentials are not supplied.
   - To enable advanced LLM natural language reasoning and dynamic chat, configure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in your environment.
3. **Database Driver Support**:
   - SQLite is used for zero-configuration local development.
   - PostgreSQL (`psycopg2-binary`) is configured for production deployments, featuring connection pool pre-pinging, recycling (1800s), and pool overflow management.

---

## Repository Structure

```
insightforge-ai/
├── frontend/                     # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/           # UI Layout, TopNav, Sidebar, ProtectedRoute
│   │   ├── context/              # Authentication & Theme state providers
│   │   ├── lib/                  # Typed API client & request wrappers
│   │   ├── pages/                # Studio pages (Datasets, EDA, ML, Agents, RAG, Reports)
│   │   ├── App.tsx               # Client router & navigation structure
│   │   └── main.tsx              # Application entrypoint
│   └── package.json
├── backend/                      # Python FastAPI Analytical Backend
│   ├── app/
│   │   ├── api/                  # REST endpoint routers (Auth, Datasets, EDA, ML, RAG, etc.)
│   │   ├── core/                 # Security, cryptographic JWT & password utilities
│   │   ├── db/                   # SQLAlchemy ORM models, session pool & migrations
│   │   ├── ml/                   # ML engine (XGBoost, Scikit-Learn, SHAP explainers)
│   │   ├── agents/               # LangGraph state machine & ReAct tool execution
│   │   ├── rag/                  # Document parsing, chunking & vector search
│   │   ├── services/             # Statistical profiling & PDF generation logic
│   │   └── main.py               # Application factory & middleware configuration
│   ├── data/                     # Local data directories (excluded via .gitignore)
│   │   ├── chroma_db/            # ChromaDB vector embedding storage
│   │   ├── knowledge_docs/       # Uploaded knowledge documents
│   │   ├── models/               # Serialized ML pipeline joblib artifacts
│   │   └── reports/              # Generated executive PDF report files
│   ├── uploads/                  # Uploaded raw datasets (excluded via .gitignore)
│   ├── migrations/               # Alembic database schema migrations
│   ├── requirements.txt          # Python dependency specifications
│   └── alembic.ini
├── datasets/                     # Public test datasets
│   └── sample/                   # sales_sample.csv for onboarding and verification
├── docs/                         # System architecture & audit specifications
├── scripts/                      # Cross-platform development & process runners
├── docker-compose.yml            # Multi-service production orchestration
├── Dockerfile.backend            # Multi-stage Python backend container image
├── Dockerfile.frontend           # Multi-stage Nginx + React build image
├── nginx.conf                    # Production reverse proxy configuration
├── .dockerignore                 # Build context security exclusions
├── .gitignore                    # Git tracking security exclusions
├── .env.example                  # Local development environment template
├── .env.production.example       # Production environment template
├── package.json                  # Root orchestration scripts
└── README.md
```

---

## License

This project is licensed under the [MIT License](LICENSE).
