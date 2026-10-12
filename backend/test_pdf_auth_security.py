import io
import sys
import uuid
import requests
import numpy as np
import pandas as pd

BASE_URL = "http://127.0.0.1:8000"

def run_pdf_auth_security_tests():
    print("=" * 80)
    print("INSIGHTFORGE AI - TARGETED PDF AUTHENTICATION & QUERY PARAMETER ELIMINATION TESTS")
    print("=" * 80)

    results = []
    def record(test_id, name, passed, details=""):
        status = "PASS" if passed else "FAIL"
        results.append((test_id, name, status, details))
        print(f"[{status}] {test_id}: {name} - {details}")

    # Step 1: Create User A and User B
    uid_suffix = uuid.uuid4().hex[:6]
    user_a_email = f"alice_pdf_{uid_suffix}@insightforge.test"
    user_b_email = f"bob_pdf_{uid_suffix}@insightforge.test"
    password = "SecurePassword2026!"

    reg_a = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": user_a_email,
        "password": password,
        "full_name": "Alice PDF Tester",
    })
    token_a = reg_a.json().get("access_token")
    record("TEST-SETUP-1", "User A Registered & Authenticated", reg_a.status_code == 200 and bool(token_a), f"Token obtained for {user_a_email}")

    reg_b = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": user_b_email,
        "password": password,
        "full_name": "Bob Cross-Auditor",
    })
    token_b = reg_b.json().get("access_token")
    record("TEST-SETUP-2", "User B Registered & Authenticated", reg_b.status_code == 200 and bool(token_b), f"Token obtained for {user_b_email}")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Step 2: User A uploads dataset and generates report
    np.random.seed(42)
    n = 35
    df = pd.DataFrame({
        "revenue": np.random.normal(500, 50, n),
        "cost": np.random.normal(300, 30, n),
        "tier": np.random.choice(["Tier1", "Tier2"], n),
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    up_res = requests.post(
        f"{BASE_URL}/api/datasets/upload",
        files={"file": ("alice_pdf_data.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=headers_a,
    )
    dataset_id = up_res.json().get("dataset_id")
    record("TEST-SETUP-3", "User A Dataset Created", up_res.status_code == 200 and bool(dataset_id), f"Dataset: {dataset_id}")

    rep_res = requests.post(
        f"{BASE_URL}/api/reports/generate",
        json={"dataset_id": dataset_id, "title": "Confidential Security Audit Report"},
        headers=headers_a,
    )
    report_id = rep_res.json().get("id") or rep_res.json().get("report_id")
    record("TEST-SETUP-4", "User A Executive PDF Report Generated", rep_res.status_code == 200 and bool(report_id), f"Report: {report_id}")

    # REQUIREMENT 5: Legitimate user can download own PDF via Authorization Bearer header
    r_legit = requests.get(f"{BASE_URL}/api/reports/{report_id}/pdf", headers=headers_a)
    is_pdf = r_legit.headers.get("content-type", "").startswith("application/pdf")
    has_pdf_magic = r_legit.content.startswith(b"%PDF")
    record(
        "REQ-5",
        "Legitimate User PDF Download via Bearer Header",
        r_legit.status_code == 200 and is_pdf and has_pdf_magic,
        f"HTTP {r_legit.status_code}, content-type: {r_legit.headers.get('content-type')}, bytes: {len(r_legit.content)}"
    )

    # REQUIREMENT 6: Unauthenticated download returns 401
    r_unauth = requests.get(f"{BASE_URL}/api/reports/{report_id}/pdf")
    record(
        "REQ-6",
        "Unauthenticated Request Blocked with HTTP 401",
        r_unauth.status_code == 401,
        f"HTTP {r_unauth.status_code}, detail: {r_unauth.json().get('detail')}"
    )

    # REQUIREMENT 7: Cross-user report download returns 403 or 404
    r_cross = requests.get(f"{BASE_URL}/api/reports/{report_id}/pdf", headers=headers_b)
    record(
        "REQ-7",
        "Cross-User PDF Access Blocked (User B accessing User A Report)",
        r_cross.status_code in (403, 404),
        f"HTTP {r_cross.status_code}, detail: {r_cross.json().get('detail')}"
    )

    # REQUIREMENT 8: Query-parameter tokens CANNOT authenticate requests
    # 8A: Query param ?token=<token_a> WITHOUT Authorization header must return 401
    r_query_a = requests.get(f"{BASE_URL}/api/reports/{report_id}/pdf?token={token_a}")
    record(
        "REQ-8A",
        "Query-Parameter Token Rejected (Cannot Authenticate)",
        r_query_a.status_code == 401,
        f"HTTP {r_query_a.status_code}, detail: {r_query_a.json().get('detail')}"
    )

    # 8B: Query param ?token=<token_a> on other endpoints (e.g. /api/auth/me) without header must return 401
    r_query_me = requests.get(f"{BASE_URL}/api/auth/me?token={token_a}")
    record(
        "REQ-8B",
        "Query-Parameter Token on /api/auth/me Rejected with 401",
        r_query_me.status_code == 401,
        f"HTTP {r_query_me.status_code}"
    )

    # 8C: Tampered/garbage Authorization header must return 401
    r_tampered = requests.get(
        f"{BASE_URL}/api/reports/{report_id}/pdf",
        headers={"Authorization": "Bearer invalid_tampered_token_xyz"}
    )
    record(
        "REQ-EXTRA",
        "Invalid Bearer Token Rejected with HTTP 401",
        r_tampered.status_code == 401,
        f"HTTP {r_tampered.status_code}"
    )

    # Clean up test entities
    requests.delete(f"{BASE_URL}/api/reports/{report_id}", headers=headers_a)
    requests.delete(f"{BASE_URL}/api/datasets/{dataset_id}", headers=headers_a)

    print("\n" + "=" * 80)
    print("PDF AUTH & SECURITY TEST SUMMARY")
    print("=" * 80)
    total = len(results)
    passed = sum(1 for _, _, s, _ in results if s == "PASS")
    print(f"Total Tests: {total} | Passed: {passed} | Failed: {total - passed}")
    print("=" * 80)
    return total == passed

if __name__ == "__main__":
    success = run_pdf_auth_security_tests()
    sys.exit(0 if success else 1)
