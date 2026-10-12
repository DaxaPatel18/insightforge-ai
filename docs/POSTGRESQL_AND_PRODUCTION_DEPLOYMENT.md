# INSIGHTFORGE AI - POSTGRESQL & MULTI-NODE PRODUCTION DEPLOYMENT GUIDE

**Date:** October 11, 2026  
**Platform Version:** InsightForge AI v0.3.0  
**Target Environments:** Docker Compose, Kubernetes, AWS ECS, Self-Hosted Linux Clusters  

---

## 1. Architectural Overview for Multi-Node Scale

InsightForge AI is architected for zero-shared-state horizontal scaling across backend nodes while maintaining strict ACID transactional consistency, real-time telemetry, and multi-tenant isolation.

```
                              [ HTTPS / 443 ]
                                     │
                          ┌──────────┴──────────┐
                          │   Nginx Reverse     │
                          │   Proxy / Ingress   │
                          │   (Port 80 / 443)   │
                          └──────────┬──────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │ FastAPI Node A  │ │ FastAPI Node B  │ │ FastAPI Node C  │
        │ (4 Uvicorn Wkrs)│ │ (4 Uvicorn Wkrs)│ │ (4 Uvicorn Wkrs)│
        └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                 │                   │                   │
                 ├───────────────────┴───────────────────┤
                 │                                       │
                 ▼                                       ▼
       ┌───────────────────┐                   ┌───────────────────┐
       │ PostgreSQL 16+    │                   │ Shared Storage    │
       │ Connection Pool   │                   │ (NFS / EFS / Vol) │
       │ (ACID & Multi-Ten)│                   │ - /uploads        │
       └───────────────────┘                   │ - /reports        │
                                               │ - /chroma_db      │
                                               └───────────────────┘
```

### Key Scaling Principles:
1. **Stateless FastAPIs**: Application instances store zero session state in local memory. Authentication is strictly stateless via signed, scoped cryptographic JWTs (`HS256`).
2. **PostgreSQL Relational Storage**: All core metadata, user accounts, datasets, model benchmarks, SHAP importances, and conversation turns reside in PostgreSQL.
3. **Optimized Connection Pooling**: Engine pre-pinging, recycling, and pool overflow limits prevent worker exhaustion.
4. **Shared Asset Volume**: Tabular file uploads, executive PDF artifacts, and ChromaDB embeddings are persisted to shared volumes mounted identically across all worker nodes.

---

## 2. Database Configuration & Connection Pooling

### Connection URI Formatting
The platform automatically parses and adapts database schemes:
- Heroku / Cloud standard: `postgres://user:pass@host:5432/dbname` -> Auto-rewritten to `postgresql+psycopg2://user:pass@host:5432/dbname`
- Standard SQLAlchemy: `postgresql://user:pass@host:5432/dbname` -> Auto-rewritten to `postgresql+psycopg2://`

### Connection Pool Sizing Matrix
Set via environment variables in `session.py`:

| Parameter | Environment Variable | Default | Recommended (1 Node) | Recommended (3+ Nodes) | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pool Size** | `DB_POOL_SIZE` | `10` | `20` | `15` per pod | Baseline persistent connections kept open |
| **Max Overflow** | `DB_MAX_OVERFLOW` | `20` | `30` | `20` per pod | Burst connections permitted during heavy loads |
| **Pool Recycle** | `DB_POOL_RECYCLE` | `1800` | `1800` | `1800` | Recycles connections every 30m to avoid DB idle drops |
| **Pool Timeout** | `DB_POOL_TIMEOUT` | `30` | `30` | `15` | Seconds to wait before raising pool exhaustion error |
| **Pre-Ping** | *(Internal)* | `True` | `True` | `True` | Executes `SELECT 1` to test connection vitality |

---

## 3. SQLite to PostgreSQL Migration Pipeline

If transitioning an existing pilot deployment with historical datasets, experiments, or users:

### Step A: Dry Run Inspection
Inspect SQLite record counts across all 12 tables without making changes:
```bash
cd backend
python -m app.db.migrate_to_postgres --dry-run
```

### Step B: Live Migration Execution
Execute the automated migration with dependency ordering and transactional commits:
```bash
python -m app.db.migrate_to_postgres \
  --sqlite-path "./insightforge.db" \
  --postgres-url "postgresql+psycopg2://insightforge_admin:password@localhost:5432/insightforge_db" \
  --batch-size 500
```

### Step C: Parity Verification
The migration script automatically queries both databases at completion and validates 100% row-for-row match across:
- `users`
- `datasets`
- `data_transformations`
- `ml_experiments`
- `analysis_history`
- `agent_sessions`
- `agent_messages`
- `knowledge_documents`
- `document_chunks`
- `reports`
- `system_evaluations`
- `dsar_requests`

---

## 4. Alembic Schema Migrations

For new PostgreSQL instances or continuous deployment pipelines:

```bash
cd backend

# View current migration status
alembic current

# Run all migrations up to latest head
alembic upgrade head
```

### Migration Version Hierarchy:
- `001_initial_schema.py`: Baseline platform tables (datasets, models, reports, agents, RAG).
- `002_auth_and_user_relations.py`: Hardened user authentication, DSAR requests, and multi-tenant `user_id` foreign keys.

---

## 5. Container Orchestration (Docker & Docker Compose)

### Single-Command Production Spin-Up
```bash
# 1. Copy and configure secrets
cp .env.production.example .env

# Generate high-entropy 64-char key and set in .env:
# openssl rand -hex 32
# Configure POSTGRES_PASSWORD in .env

# 2. Build and launch all services
docker compose up -d --build
```

### Scaling Backend Worker Nodes & Embedded ChromaDB Guidance
InsightForge AI supports horizontal container scaling:
```bash
docker compose up -d --scale backend=3
```
- **Container Naming**: The backend service deliberately omits static `container_name` directives, allowing Docker Compose to instantiate arbitrary replicas (`backend-1`, `backend-2`, etc.) without collision.
- **Port Exposure & Ingress**: In production, the Nginx reverse-proxy routes external web traffic (`/api/`, `/health`, `/docs`) across all backend instances via Docker internal DNS. Direct host bindings are restricted to `127.0.0.1` for local administrative diagnosis. When scaling multiple backend replicas, omit static host port mappings or assign dynamic ports.
- **ChromaDB Vector Concurrency**:
  - **Embedded ChromaDB (Default)**: Embedded ChromaDB runs SQLite under the hood. Setting `BACKEND_WORKERS=1` per node prevents inter-process SQLite write lock contention and in-memory cache desynchronization.
  - **Distributed Multi-Worker / Multi-Node**: For high-concurrency clusters with 4+ workers per node, configure an external ChromaDB service (`CHROMA_SERVER_HOST=chroma-server`). The backend automatically connects via `HttpClient`.

### Service Health Checks:
- **PostgreSQL**: `pg_isready -U insightforge_admin -d insightforge_db`
- **Backend API**: `curl -f http://127.0.0.1:8000/health` (Reports `{ status: "ok", database: { status: "healthy", dialect: "postgresql" } }`)
- **Frontend / Ingress**: `wget --spider http://127.0.0.1/`


---

## 6. Automated Readiness Verification

Execute the automated test suite to confirm PostgreSQL readiness, drivers, pooling, and migrations:
```bash
cd backend
python test_postgres_readiness.py
```

Output:
```text
[PASS] PostgreSQL driver (psycopg2) successfully imported.
[PASS] DATABASE_URL scheme normalization verified for all PostgreSQL variants.
[PASS] check_db_connection() reported: {'status': 'healthy', 'dialect': 'sqlite'}
[PASS] Alembic migration validated: 001_initial_schema.py
[PASS] Alembic migration validated: 002_auth_and_user_relations.py
[PASS] SQLite-to-PostgreSQL migration pipeline dry-run verified.
Ran 5 tests in 0.878s - OK
```
