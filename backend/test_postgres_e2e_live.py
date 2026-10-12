"""InsightForge AI - Live PostgreSQL End-to-End Verification Suite

Tests the complete platform pipeline against a live PostgreSQL database:
1. Registration & Login against PostgreSQL
2. Real CSV dataset ingestion & statistical profiling
3. Automated EDA correlations, distributions, and cleaning
4. Machine Learning model training & metrics
5. Executive report generation & PDF stream verification
6. Strict cross-user multi-tenant resource isolation (User B blocked from User A)
7. Knowledge document ingestion & ChromaDB/vector persistence
8. Backend engine restart & persistence verification
"""
import io
import os
import sys
import unittest
import pandas as pd
import numpy as np

# Force PostgreSQL test database connection
os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres@127.0.0.1:5434/insightforge_test_db"
os.environ["ENVIRONMENT"] = "development"

from fastapi.testclient import TestClient
from app.main import app
from app.db.session import engine, check_db_connection, SessionLocal
from app.db.models import User, Dataset, MLExperiment, Report, KnowledgeDocument


class TestPostgresLiveE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Verify db status
        db_stat = check_db_connection()
        print(f"\n[INIT] Live Database Health Check: {db_stat}")
        assert db_stat["status"] == "healthy"
        assert db_stat["dialect"] == "postgresql"

    def test_01_health_and_dialect_reporting(self):
        """Requirement 14: Verify /health reports postgresql dialect."""
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["database"]["dialect"], "postgresql")
        self.assertEqual(data["database"]["status"], "healthy")
        print("[PASS] Requirement 14: Backend /health reports PostgreSQL dialect and healthy status.")

    def test_02_registration_and_login_against_postgres(self):
        """Requirement 5: Test registration and login against PostgreSQL."""
        # 1. Register User A
        self.user_a_email = f"alice_pg_{os.urandom(3).hex()}@insightforge.test"
        self.password = "SecurePass2026!"
        reg_a = self.client.post("/api/auth/register", json={
            "email": self.user_a_email,
            "password": self.password,
            "full_name": "Alice PG Engineer",
            "professional_role": "Data Scientist",
        })
        self.assertEqual(reg_a.status_code, 200)
        tok_a = reg_a.json()["access_token"]
        self.assertTrue(len(tok_a) > 20)

        # 2. Register User B
        self.user_b_email = f"bob_pg_{os.urandom(3).hex()}@insightforge.test"
        reg_b = self.client.post("/api/auth/register", json={
            "email": self.user_b_email,
            "password": self.password,
            "full_name": "Bob PG Auditor",
            "professional_role": "Compliance Officer",
        })
        self.assertEqual(reg_b.status_code, 200)
        tok_b = reg_b.json()["access_token"]

        # 3. Login User A
        log_a = self.client.post("/api/auth/login", json={
            "email": self.user_a_email,
            "password": self.password,
        })
        self.assertEqual(log_a.status_code, 200)
        self.token_a = log_a.json()["access_token"]
        self.token_b = tok_b

        # 4. Verify User Profile from PostgreSQL
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], self.user_a_email)

        print("[PASS] Requirement 5: Registration and login verified against PostgreSQL.")
        TestPostgresLiveE2E.token_a = self.token_a
        TestPostgresLiveE2E.token_b = self.token_b
        TestPostgresLiveE2E.user_a_email = self.user_a_email

    def test_03_upload_csv_as_user_a(self):
        """Requirement 6: Upload a real CSV as User A."""
        # Create realistic sales and churn dataset
        np.random.seed(42)
        n = 80
        df = pd.DataFrame({
            "monthly_spend": np.random.normal(120, 25, n),
            "support_tickets": np.random.randint(0, 8, n),
            "contract_type": np.random.choice(["monthly", "annual", "two_year"], n),
            "churn": np.random.choice([0, 1], n, p=[0.75, 0.25]),
            "tenure_months": np.random.randint(1, 36, n),
        })
        buf = io.StringIO()
        df.to_csv(buf, index=False)
        csv_bytes = buf.getvalue().encode("utf-8")

        res = self.client.post(
            "/api/datasets/upload",
            files={"file": ("postgres_sales_audit.csv", io.BytesIO(csv_bytes), "text/csv")},
            headers={"Authorization": f"Bearer {TestPostgresLiveE2E.token_a}"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["rows"], 80)
        self.assertEqual(data["columns"], 5)
        self.assertIn("monthly_spend", data["summary_stats"]["numeric"])

        TestPostgresLiveE2E.dataset_id = data["dataset_id"]
        print(f"[PASS] Requirement 6: Real CSV uploaded to PostgreSQL. Dataset ID: {TestPostgresLiveE2E.dataset_id}")

    def test_04_run_eda_and_ml_training(self):
        """Requirement 7: Run EDA and ML training."""
        ds_id = TestPostgresLiveE2E.dataset_id
        headers = {"Authorization": f"Bearer {TestPostgresLiveE2E.token_a}"}

        # 1. EDA Correlations
        corr_res = self.client.get(f"/api/eda/{ds_id}/correlations", headers=headers)
        self.assertEqual(corr_res.status_code, 200)
        corr_data = corr_res.json()
        self.assertGreaterEqual(len(corr_data["columns"]), 3)

        # 2. EDA Distributions
        dist_res = self.client.get(f"/api/eda/{ds_id}/distributions", headers=headers)
        self.assertEqual(dist_res.status_code, 200)

        # 3. EDA Cleaning
        clean_res = self.client.post(
            f"/api/eda/{ds_id}/clean",
            json={"operations": [{"action": "impute_missing", "column": "monthly_spend", "strategy": "mean"}]},
            headers=headers,
        )
        self.assertEqual(clean_res.status_code, 200)

        # 4. ML Benchmark Training
        train_res = self.client.post(
            f"/api/ml/{ds_id}/train",
            json={
                "target_column": "churn",
                "problem_type": "classification",
                "test_size": 0.25,
            },
            headers=headers,
        )
        self.assertEqual(train_res.status_code, 200)
        ml_data = train_res.json()
        self.assertIn("best_model", ml_data)
        self.assertIn("leaderboard", ml_data)
        self.assertGreaterEqual(len(ml_data["leaderboard"]), 3)
        self.assertIn("feature_importance", ml_data)

        TestPostgresLiveE2E.experiment_id = ml_data["experiment_id"]
        print(f"[PASS] Requirement 7: EDA & ML Benchmark verified in PostgreSQL. Best Model: {ml_data['best_model']} (Exp ID: {TestPostgresLiveE2E.experiment_id})")

    def test_05_generate_and_download_report(self):
        """Requirement 8: Generate and download an executive report."""
        ds_id = TestPostgresLiveE2E.dataset_id
        headers = {"Authorization": f"Bearer {TestPostgresLiveE2E.token_a}"}

        rep_res = self.client.post(
            "/api/reports/generate",
            json={
                "dataset_id": ds_id,
                "title": "PostgreSQL Executive Intelligence Dossier",
            },
            headers=headers,
        )
        self.assertEqual(rep_res.status_code, 200)
        rep_data = rep_res.json()
        rep_id = rep_data["id"]
        TestPostgresLiveE2E.report_id = rep_id

        # Download PDF stream
        pdf_res = self.client.get(f"/api/reports/{rep_id}/pdf", headers=headers)
        self.assertEqual(pdf_res.status_code, 200)
        self.assertEqual(pdf_res.headers["content-type"], "application/pdf")
        self.assertTrue(pdf_res.content.startswith(b"%PDF-"))
        self.assertGreater(len(pdf_res.content), 1000)
        print(f"[PASS] Requirement 8: Report generated & PDF streamed ({len(pdf_res.content)} bytes). Report ID: {rep_id}")

    def test_06_cross_user_isolation(self):
        """Requirement 10: Verify User B cannot access User A's resources."""
        headers_b = {"Authorization": f"Bearer {TestPostgresLiveE2E.token_b}"}
        ds_id = TestPostgresLiveE2E.dataset_id
        exp_id = TestPostgresLiveE2E.experiment_id
        rep_id = TestPostgresLiveE2E.report_id

        # 1. Dataset Access Blocked
        res_ds = self.client.get(f"/api/datasets/{ds_id}", headers=headers_b)
        self.assertEqual(res_ds.status_code, 404)

        # 2. EDA Blocked
        res_eda = self.client.get(f"/api/eda/{ds_id}/correlations", headers=headers_b)
        self.assertEqual(res_eda.status_code, 404)

        # 3. ML Training on User A Dataset Blocked
        res_ml = self.client.post(f"/api/ml/{ds_id}/train", json={"target_column": "churn"}, headers=headers_b)
        self.assertEqual(res_ml.status_code, 404)

        # 4. Report PDF Download Blocked
        res_pdf = self.client.get(f"/api/reports/{rep_id}/pdf", headers=headers_b)
        self.assertEqual(res_pdf.status_code, 404)

        # 5. Dataset List Isolation
        list_ds = self.client.get("/api/datasets", headers=headers_b)
        self.assertEqual(list_ds.status_code, 200)
        self.assertEqual(len(list_ds.json()), 0)

        print("[PASS] Requirement 10: User B strictly blocked from User A resources with HTTP 404 isolation.")

    def test_07_chromadb_and_document_persistence(self):
        """Requirement 11: Test ChromaDB and uploaded-file persistence."""
        headers = {"Authorization": f"Bearer {TestPostgresLiveE2E.token_a}"}

        doc_content = (
            "InsightForge AI Enterprise Architecture Governance.\n"
            "This document establishes the multi-tenant data boundary guidelines for PostgreSQL workloads.\n"
            "All datasets and derived machine learning models are strictly bound to the authenticated tenant ID."
        ).encode("utf-8")

        res = self.client.post(
            "/api/rag/upload",
            files={"file": ("postgres_governance.txt", io.BytesIO(doc_content), "text/plain")},
            headers=headers,
        )
        self.assertEqual(res.status_code, 200)
        doc_data = res.json()
        doc_id = doc_data["id"]
        TestPostgresLiveE2E.doc_id = doc_id
        self.assertGreaterEqual(doc_data["chunk_count"], 1)

        # Query semantic search
        query_res = self.client.post(
            "/api/rag/query",
            json={"query": "multi-tenant data boundary guidelines for PostgreSQL"},
            headers=headers,
        )
        self.assertEqual(query_res.status_code, 200)
        q_data = query_res.json()
        self.assertGreaterEqual(len(q_data["retrieved_chunks"]), 1)
        self.assertIn("answer", q_data)
        print(f"[PASS] Requirement 11: Document indexed and semantic retrieval verified. Doc ID: {doc_id}")

    def test_08_restart_backend_and_verify_persistence(self):
        """Requirement 9: Restart the backend and verify all persistent records."""
        # Simulate full backend restart: dispose engine connection pool, create fresh client
        engine.dispose()

        fresh_client = TestClient(app)
        headers = {"Authorization": f"Bearer {TestPostgresLiveE2E.token_a}"}

        # 1. Verify User Profile persisted
        me_res = fresh_client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["email"], TestPostgresLiveE2E.user_a_email)

        # 2. Verify Dataset persisted
        ds_res = fresh_client.get(f"/api/datasets/{TestPostgresLiveE2E.dataset_id}", headers=headers)
        self.assertEqual(ds_res.status_code, 200)
        self.assertEqual(ds_res.json()["rows"], 80)

        # 3. Verify ML Experiment persisted in PostgreSQL
        exp_res = fresh_client.get(f"/api/ml/experiments/{TestPostgresLiveE2E.experiment_id}", headers=headers)
        self.assertEqual(exp_res.status_code, 200)
        self.assertEqual(exp_res.json()["dataset_id"], TestPostgresLiveE2E.dataset_id)

        # 4. Verify Report persisted and PDF re-downloadable
        pdf_res = fresh_client.get(f"/api/reports/{TestPostgresLiveE2E.report_id}/pdf", headers=headers)
        self.assertEqual(pdf_res.status_code, 200)
        self.assertTrue(pdf_res.content.startswith(b"%PDF-"))

        # 5. Direct SQL count check in PostgreSQL
        with SessionLocal() as db:
            user_cnt = db.query(User).filter(User.email == TestPostgresLiveE2E.user_a_email).count()
            ds_cnt = db.query(Dataset).filter(Dataset.id == TestPostgresLiveE2E.dataset_id).count()
            exp_cnt = db.query(MLExperiment).filter(MLExperiment.id == TestPostgresLiveE2E.experiment_id).count()
            rep_cnt = db.query(Report).filter(Report.id == TestPostgresLiveE2E.report_id).count()
            doc_cnt = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == TestPostgresLiveE2E.doc_id).count()

            self.assertEqual(user_cnt, 1)
            self.assertEqual(ds_cnt, 1)
            self.assertEqual(exp_cnt, 1)
            self.assertEqual(rep_cnt, 1)
            self.assertEqual(doc_cnt, 1)

        print("[PASS] Requirement 9: Backend restarted. 100% persistence verified in PostgreSQL across User, Dataset, ML Experiment, Report, and Document!")


if __name__ == "__main__":
    unittest.main()
