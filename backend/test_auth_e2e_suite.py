import io
import sys
import time
import uuid
import requests
import pandas as pd
from app.core.security import create_access_token, hash_password, JWT_SECRET_KEY

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_auth_suite():
    print("=" * 80)
    print("INSIGHTFORGE AI - END-TO-END AUTHENTICATION & OBJECT ISOLATION SUITE")
    print("=" * 80)

    test_results = []
    def record(test_id, name, passed, details=""):
        status = "PASS" if passed else "FAIL"
        test_results.append((test_id, name, status, details))
        print(f"[{status}] {test_id}: {name} - {details}")

    # =========================================================================
    # 1. REGISTRATION WORKFLOW TESTS
    # =========================================================================
    print("\n--- 1. Testing Registration Workflows ---")
    unique_suffix = uuid.uuid4().hex[:6]
    user_a_email = f"alice_{unique_suffix}@insightforge.test"
    user_b_email = f"bob_{unique_suffix}@insightforge.test"
    valid_password = "StrongPassword2026!"

    # 1A: Valid registration for User A
    reg_a = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": user_a_email,
        "password": valid_password,
        "full_name": "Alice Researcher",
    })
    token_a = reg_a.json().get("access_token")
    user_a_id = reg_a.json().get("user", {}).get("id")
    record("AUTH-REG-1", "Valid User A Registration", reg_a.status_code == 200 and bool(token_a), f"ID: {user_a_id}")

    # 1B: Valid registration for User B
    reg_b = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": user_b_email,
        "password": valid_password,
        "full_name": "Bob Analyst",
    })
    token_b = reg_b.json().get("access_token")
    user_b_id = reg_b.json().get("user", {}).get("id")
    record("AUTH-REG-2", "Valid User B Registration", reg_b.status_code == 200 and bool(token_b), f"ID: {user_b_id}")

    # 1C: Duplicate email rejected
    reg_dup = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": user_a_email,
        "password": valid_password,
        "full_name": "Duplicate Alice",
    })
    record("AUTH-REG-3", "Duplicate Email Rejection", reg_dup.status_code == 409, f"Returned HTTP {reg_dup.status_code}")

    # 1D: Invalid email format rejected
    reg_inv_email = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "not_an_email_address",
        "password": valid_password,
    })
    record("AUTH-REG-4", "Invalid Email Format Rejection", reg_inv_email.status_code == 400, f"Returned HTTP {reg_inv_email.status_code}")

    # 1E: Short password (<8 characters) rejected
    reg_short_pass = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": f"short_{unique_suffix}@insightforge.test",
        "password": "short",
    })
    record("AUTH-REG-5", "Weak/Short Password Rejection", reg_short_pass.status_code == 400, f"Returned HTTP {reg_short_pass.status_code}")

    # =========================================================================
    # 2. LOGIN WORKFLOW TESTS
    # =========================================================================
    print("\n--- 2. Testing Login Workflows ---")
    # 2A: Valid login succeeds
    login_a = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": user_a_email,
        "password": valid_password,
    })
    token_a_login = login_a.json().get("access_token")
    record("AUTH-LOG-1", "Valid Login Credentials", login_a.status_code == 200 and bool(token_a_login), "Issued JWT Bearer token")

    # 2B: Invalid password rejected
    login_bad_pw = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": user_a_email,
        "password": "WrongPassword2026!",
    })
    record("AUTH-LOG-2", "Incorrect Password Rejection", login_bad_pw.status_code == 401, f"Returned HTTP {login_bad_pw.status_code}")

    # 2C: Nonexistent user rejected
    login_unknown = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": f"nonexistent_{unique_suffix}@insightforge.test",
        "password": valid_password,
    })
    record("AUTH-LOG-3", "Unknown Account Rejection", login_unknown.status_code == 401, f"Returned HTTP {login_unknown.status_code}")

    # 2D: Demo Admin login endpoint permanently removed (assert 404 on POST & GET)
    demo_post = requests.post(f"{BASE_URL}/api/auth/demo-login")
    demo_get = requests.get(f"{BASE_URL}/api/auth/demo-login")
    record("AUTH-DEMO-REM", "Demo Login Endpoint Completely Removed", demo_post.status_code == 404 and demo_get.status_code == 404, f"POST: {demo_post.status_code}, GET: {demo_get.status_code}")

    # =========================================================================
    # 3. JWT SIGNATURE & SESSION SECURITY
    # =========================================================================
    print("\n--- 3. Testing JWT Validation & Signature Verification ---")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3A: Valid token profile fetch
    me_a = requests.get(f"{BASE_URL}/api/auth/me", headers=headers_a)
    record("JWT-SEC-1", "Valid Token User Profile (/api/auth/me)", me_a.status_code == 200 and me_a.json().get("email") == user_a_email, f"Email: {user_a_email}")

    # 3B: Tampered JWT rejected
    tampered_token = token_a[:-5] + "XXXXX"
    me_tampered = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    record("JWT-SEC-2", "Tampered JWT Rejection", me_tampered.status_code == 401, f"Returned HTTP {me_tampered.status_code}")

    # 3C: Expired JWT rejected
    expired_token = create_access_token({"sub": user_a_id, "email": user_a_email, "role": "member"}, expires_delta_seconds=-3600)
    me_expired = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    record("JWT-SEC-3", "Expired JWT Rejection", me_expired.status_code == 401, f"Returned HTTP {me_expired.status_code}")

    # 3D: Missing Authorization Header rejected on protected routes
    unauth_datasets = requests.get(f"{BASE_URL}/api/datasets")
    record("JWT-SEC-4", "Unauthenticated Route Rejection", unauth_datasets.status_code == 401, f"Returned HTTP {unauth_datasets.status_code}")

    # 3E: Algorithm 'none' attack rejected
    import base64
    none_header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').decode().rstrip("=")
    none_payload = base64.urlsafe_b64encode(f'{{"sub":"{user_a_id}","email":"{user_a_email}","role":"member","exp":9999999999}}'.encode()).decode().rstrip("=")
    none_token = f"{none_header}.{none_payload}."
    me_none = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {none_token}"})
    record("JWT-SEC-5", "Algorithm None Attack Rejection", me_none.status_code == 401, f"Returned HTTP {me_none.status_code}")

    # =========================================================================
    # 4. CROSS-USER OBJECT-LEVEL ISOLATION (USER A vs USER B)
    # =========================================================================
    print("\n--- 4. Testing Comprehensive Cross-User Resource Isolation ---")
    # User A uploads a private dataset (30 observations for valid ML train/test split)
    import numpy as np
    np.random.seed(42)
    n_samples = 40
    df_a = pd.DataFrame({
        "revenue": np.random.normal(500, 50, n_samples),
        "spend": np.random.normal(50, 10, n_samples),
        "churn": np.random.choice([0, 1], size=n_samples, p=[0.6, 0.4]),
    })
    csv_bytes = df_a.to_csv(index=False).encode("utf-8")
    up_res = requests.post(
        f"{BASE_URL}/api/datasets/upload",
        files={"file": ("alice_financials.csv", io.BytesIO(csv_bytes), "text/csv")},
        headers=headers_a,
    )
    dataset_a_id = up_res.json().get("dataset_id")
    record("ISO-DATA-1", "User A Private Dataset Upload", up_res.status_code == 200 and bool(dataset_a_id), f"Dataset ID: {dataset_a_id}")

    # 4A: User B cannot see User A's dataset in their dataset listing
    b_datasets = requests.get(f"{BASE_URL}/api/datasets", headers=headers_b).json()
    b_dataset_ids = [d.get("dataset_id") for d in b_datasets]
    record("ISO-DATA-2", "User B Dataset List Isolation", dataset_a_id not in b_dataset_ids, f"User B sees {len(b_dataset_ids)} datasets")

    # 4B: User B cannot read User A's dataset details
    b_get_res = requests.get(f"{BASE_URL}/api/datasets/{dataset_a_id}", headers=headers_b)
    record("ISO-DATA-3", "User B Blocked From Reading User A Dataset", b_get_res.status_code in [403, 404], f"Returned HTTP {b_get_res.status_code}")

    # 4C: User B cannot trigger EDA on User A's dataset
    b_eda_res = requests.get(f"{BASE_URL}/api/eda/{dataset_a_id}/correlations", headers=headers_b)
    record("ISO-EDA-1", "User B Blocked From Running EDA On User A Dataset", b_eda_res.status_code in [403, 404], f"Returned HTTP {b_eda_res.status_code}")

    # 4D: User B cannot train ML models on User A's dataset
    b_train_res = requests.post(f"{BASE_URL}/api/ml/{dataset_a_id}/train", json={
        "target_column": "churn",
        "problem_type": "classification",
        "test_size": 0.2,
    }, headers=headers_b)
    record("ISO-ML-1", "User B Blocked From Training ML On User A Dataset", b_train_res.status_code in [403, 404], f"Returned HTTP {b_train_res.status_code}")

    # 4E: User A trains an ML model
    a_train_res = requests.post(f"{BASE_URL}/api/ml/{dataset_a_id}/train", json={
        "target_column": "churn",
        "problem_type": "classification",
        "test_size": 0.2,
    }, headers=headers_a)
    exp_a_id = a_train_res.json().get("experiment_id") or a_train_res.json().get("id") if a_train_res.status_code == 200 else None
    record("ISO-ML-2", "User A Trains ML Model", a_train_res.status_code == 200 and bool(exp_a_id), f"Exp ID: {exp_a_id}")

    # 4F: User B cannot access User A's ML experiment
    if exp_a_id:
        b_exp_res = requests.get(f"{BASE_URL}/api/ml/experiments/{exp_a_id}", headers=headers_b)
        record("ISO-ML-3", "User B Blocked From User A ML Experiment", b_exp_res.status_code in [403, 404], f"Returned HTTP {b_exp_res.status_code}")

    # 4G: User A creates a Report and User B cannot download it
    a_rep_res = requests.post(f"{BASE_URL}/api/reports/generate", json={
        "dataset_id": dataset_a_id,
        "title": "Alice Confidential Briefing",
    }, headers=headers_a)
    report_a_id = a_rep_res.json().get("id") or a_rep_res.json().get("report_id") if a_rep_res.status_code == 200 else None
    record("ISO-REP-1", "User A Executive Report Creation", a_rep_res.status_code == 200 and bool(report_a_id), f"Report ID: {report_a_id}")

    if report_a_id:
        b_dl_res = requests.get(f"{BASE_URL}/api/reports/{report_a_id}/pdf", headers=headers_b)
        record("ISO-REP-2", "User B Blocked From Downloading User A PDF Report", b_dl_res.status_code in [403, 404], f"Returned HTTP {b_dl_res.status_code}")

    # 4H: User B cannot delete User A's dataset
    b_del_res = requests.delete(f"{BASE_URL}/api/datasets/{dataset_a_id}", headers=headers_b)
    record("ISO-DATA-4", "User B Blocked From Deleting User A Dataset", b_del_res.status_code in [403, 404], f"Returned HTTP {b_del_res.status_code}")

    # 4I: User A can delete their own dataset and all cascade resources
    a_del_res = requests.delete(f"{BASE_URL}/api/datasets/{dataset_a_id}", headers=headers_a)
    record("ISO-DATA-5", "User A Cleanly Deletes Own Dataset", a_del_res.status_code == 200, "Cleaned up owned assets")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("\n" + "=" * 80)
    print("E2E AUTHENTICATION & OBJECT ISOLATION SUMMARY")
    print("=" * 80)
    total_count = len(test_results)
    passed_count = sum(1 for _, _, s, _ in test_results if s == "PASS")
    failed_count = total_count - passed_count
    print(f"Total Tests Executed: {total_count} | Passed: {passed_count} | Failed: {failed_count}")
    print("=" * 80)

    return failed_count == 0

if __name__ == "__main__":
    success = run_e2e_auth_suite()
    sys.exit(0 if success else 1)
