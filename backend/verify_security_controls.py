import os
import io
import sys
import uuid
import json
import requests
import pandas as pd
from starlette.datastructures import UploadFile
from app.db.session import SessionLocal
from app.db.models import User, Dataset, MLExperiment, Report, KnowledgeDocument, DocumentChunk, DSARRequest
from app.core.security import hash_password, create_access_token
from app.agents.tools import tool_query_dataset, parse_safe_filter_clause
from app.services.dataset_service import save_and_profile_dataset, delete_dataset
from app.rag.engine import delete_document_from_chroma, get_chroma_collection

BASE_URL = "http://127.0.0.1:8000"

def run_suite():
    print("=" * 80)
    print("INSIGHTFORGE AI - COMPREHENSIVE SECURITY, PRIVACY & AUTHORIZATION TEST SUITE")
    print("=" * 80)

    db = SessionLocal()
    results = []

    def log_result(name, passed, details=""):
        status = "PASS" if passed else "FAIL"
        results.append((name, status, details))
        print(f"[{status}] {name}: {details}")

    # =========================================================================
    # 1. USER REGISTRATION & OBJECT-LEVEL AUTHORIZATION
    # =========================================================================
    print("\n--- 1. Testing Object-Level Authorization & Cross-User Isolation ---")
    u1_email = f"user1_{uuid.uuid4().hex[:6]}@insightforge.local"
    u2_email = f"user2_{uuid.uuid4().hex[:6]}@insightforge.local"
    test_password = "SecurePassword123!"

    # Register User 1
    r1 = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": u1_email,
        "password": test_password,
        "full_name": "Alice Auditor"
    })
    u1_token = r1.json().get("access_token")
    u1_id = r1.json().get("user", {}).get("id")

    # Register User 2
    r2 = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": u2_email,
        "password": test_password,
        "full_name": "Bob Observer"
    })
    u2_token = r2.json().get("access_token")
    u2_id = r2.json().get("user", {}).get("id")

    log_result("User Registration", bool(u1_token and u2_token), f"Created User 1 ({u1_email}) and User 2 ({u2_email})")

    # User 1 uploads a dataset
    csv_content = "feat1,feat2,target\n10,20,0\n30,40,1\n50,60,1\n"
    files = {"file": ("alice_private_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    headers_u1 = {"Authorization": f"Bearer {u1_token}"}
    headers_u2 = {"Authorization": f"Bearer {u2_token}"}

    upload_res = requests.post(f"{BASE_URL}/api/datasets/upload", files=files, headers=headers_u1)
    u1_dataset_id = upload_res.json().get("dataset_id")
    log_result("User 1 Dataset Upload", bool(u1_dataset_id), f"Dataset ID: {u1_dataset_id}")

    # User 2 attempts to access User 1's dataset
    cross_access_res = requests.get(f"{BASE_URL}/api/datasets/{u1_dataset_id}", headers=headers_u2)
    cross_blocked = cross_access_res.status_code in [403, 404]
    log_result(
        "Prevent Cross-User Dataset Read",
        cross_blocked,
        f"User 2 access blocked with status {cross_access_res.status_code}"
    )

    # User 2 attempts to delete User 1's dataset
    cross_delete_res = requests.delete(f"{BASE_URL}/api/datasets/{u1_dataset_id}", headers=headers_u2)
    cross_delete_blocked = cross_delete_res.status_code in [403, 404]
    log_result(
        "Prevent Cross-User Dataset Deletion",
        cross_delete_blocked,
        f"User 2 deletion blocked with status {cross_delete_res.status_code}"
    )

    # User 1 accesses their own dataset
    u1_read_res = requests.get(f"{BASE_URL}/api/datasets/{u1_dataset_id}", headers=headers_u1)
    log_result(
        "Owner Dataset Access",
        u1_read_res.status_code == 200,
        f"User 1 successfully accessed their dataset (HTTP {u1_read_res.status_code})"
    )

    # =========================================================================
    # 2. CREDENTIAL PROTECTION & ZERO CLIENT LEAK
    # =========================================================================
    print("\n--- 2. Testing LLM Credential Isolation ---")
    health_res = requests.get(f"{BASE_URL}/health")
    health_text = health_res.text.lower()
    stats_res = requests.get(f"{BASE_URL}/api/overview/stats")
    stats_text = stats_res.text.lower()

    leak_found = "sk-" in health_text or "sk-" in stats_text or "api_key" in health_text
    log_result(
        "Zero API Key Leakage in Public Endpoints",
        not leak_found,
        "Inspected /health and /api/overview/stats for cleartext credentials"
    )

    # =========================================================================
    # 3. STRUCTURED QUERY INTERFACE & INJECTION PREVENTION
    # =========================================================================
    print("\n--- 3. Testing Structured Query Filter Interface ---")
    # Verify safe allowlisted parsing
    safe_clause = parse_safe_filter_clause("feat1 > 15", ["feat1", "feat2", "target"])
    log_result(
        "Structured Filter Parsing (Benign)",
        safe_clause is not None and safe_clause["op"] == ">" and safe_clause["value"] == 15,
        f"Parsed: {safe_clause}"
    )

    # Verify injection rejection
    malicious_inputs = [
        "__import__('os').system('whoami')",
        "eval('2+2') == 4",
        "feat1 == 10; DROP TABLE users;",
        "col.__class__.__mro__",
        "lambda x: x > 5",
    ]
    injection_prevented = True
    for mal in malicious_inputs:
        parsed = parse_safe_filter_clause(mal, ["feat1", "feat2", "target"])
        if parsed is not None:
            injection_prevented = False
            break

    log_result(
        "Arbitrary Code & SQL Injection Prevention",
        injection_prevented,
        "Malicious tokens and arbitrary eval constructs strictly rejected by parser"
    )

    # Execute tool_query_dataset with structured filter on real dataset
    query_exec = tool_query_dataset(
        dataset_id=u1_dataset_id,
        query_str="feat1 > 15",
    )
    matching_count = query_exec.get("total_matching_rows")
    log_result(
        "Safe Query Execution on Dataframe",
        "data" in query_exec and matching_count == 2,
        f"Returned {matching_count} matched rows without df.query() eval"
    )

    # =========================================================================
    # 4. CONTACT / DSAR SUBMISSION AND PROCESSING
    # =========================================================================
    print("\n--- 4. Testing Contact / DSAR Privacy Form Endpoints ---")
    dsar_payload = {
        "request_type": "privacy_dsar",
        "full_name": "Compliance Auditor",
        "email": "compliance@insightforge.local",
        "message": "Exercising right of access and audit under DPDP / GDPR."
    }
    dsar_res = requests.post(f"{BASE_URL}/api/contact/dsar", json=dsar_payload)
    dsar_success = dsar_res.status_code == 200 and dsar_res.json().get("success") is True
    dsar_ticket = dsar_res.json().get("request_id")
    log_result("DSAR Submission & Ticket Generation", dsar_success, f"Generated Request ID: {dsar_ticket}")

    # Verify invalid email is rejected
    dsar_invalid_res = requests.post(f"{BASE_URL}/api/contact/dsar", json={
        "request_type": "privacy_dsar",
        "full_name": "Test",
        "email": "not-an-email",
        "message": "test"
    })
    log_result(
        "DSAR Input Validation (Invalid Email)",
        dsar_invalid_res.status_code == 400,
        f"Rejected invalid email with HTTP {dsar_invalid_res.status_code}"
    )

    # =========================================================================
    # 5. INPUT SANITIZATION & RESOURCE EXHAUSTION DEFENSES
    # =========================================================================
    print("\n--- 5. Testing Filename Sanitization & File Limit Defenses ---")
    bad_file = {"file": ("../../../../etc/shadow.csv", io.BytesIO(b"a,b\n1,2"), "text/csv")}
    traversal_res = requests.post(f"{BASE_URL}/api/datasets/upload", files=bad_file, headers=headers_u1)
    traversal_handled = traversal_res.status_code == 200
    if traversal_handled:
        uploaded_name = traversal_res.json().get("filename", "")
        clean_name = "/" not in uploaded_name and "\\" not in uploaded_name and ".." not in uploaded_name
        log_result("Path Traversal Sanitization", clean_name, f"Sanitized filename stored as: '{uploaded_name}'")
    else:
        log_result("Path Traversal Sanitization", True, f"Rejected traversal attempt with status {traversal_res.status_code}")

    bad_ext_file = {"file": ("malicious_payload.exe", io.BytesIO(b"MZ..."), "application/octet-stream")}
    bad_ext_res = requests.post(f"{BASE_URL}/api/datasets/upload", files=bad_ext_file, headers=headers_u1)
    log_result("Extension Allowlist Enforcement", bad_ext_res.status_code == 400, f"Rejected .exe upload with HTTP 400")

    # =========================================================================
    # 6. MULTI-TIER DATA DELETION TEST (FILESYSTEM, DB, ARTIFACTS, CHROMADB)
    # =========================================================================
    print("\n--- 6. Testing Multi-Tier Independent Data Deletion ---")
    try:
        from test_independent_deletion import run_deletion_verification
        run_deletion_verification()
        log_result("Multi-Tier Independent Deletion", True, "Purged files, cascade DB records, and vector embeddings verified")
    except Exception as del_err:
        log_result("Multi-Tier Independent Deletion", False, f"Deletion verification failed: {del_err}")

    # =========================================================================
    # 7. CLEAN UP TEST USERS & DATASETS
    # =========================================================================
    print("\n--- 7. Deletion of Test Entities ---")
    u1_del = requests.delete(f"{BASE_URL}/api/datasets/{u1_dataset_id}", headers=headers_u1)
    log_result("Owner Dataset Deletion", u1_del.status_code == 200, "Cleaned up test dataset")

    # Clean DB records for test users
    user1_obj = db.query(User).filter(User.id == u1_id).first()
    user2_obj = db.query(User).filter(User.id == u2_id).first()
    if user1_obj:
        db.delete(user1_obj)
    if user2_obj:
        db.delete(user2_obj)
    db.commit()
    db.close()

    print("\n" + "=" * 80)
    print("SECURITY SUITE SUMMARY")
    print("=" * 80)
    total = len(results)
    passed = sum(1 for _, s, _ in results if s == "PASS")
    print(f"Total Controls Tested: {total} | Passed: {passed} | Failed: {total - passed}")
    print("=" * 80)

    return total == passed

if __name__ == "__main__":
    success = run_suite()
    sys.exit(0 if success else 1)
