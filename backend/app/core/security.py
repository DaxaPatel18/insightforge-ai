import os
import time
import json
import base64
import hmac
import hashlib
import secrets
from typing import Dict, Any, Optional

try:
    from dotenv import load_dotenv
    BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    load_dotenv(os.path.join(BACKEND_DIR, ".env"))
    load_dotenv(os.path.join(os.path.dirname(BACKEND_DIR), ".env"))
except Exception:
    pass

# Environment and Secret Key configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
JWT_SECRET_KEY = os.getenv("INSIGHTFORGE_SECRET_KEY")

KNOWN_INSECURE_SECRETS = {
    "f792b8cd9a43e811bc638645037d04f128bebc5a8e0e7a884ef9dc3cf26bf427",
    "replace_with_a_cryptographically_secure_random_64_character_hex_key",
    "insecure-dev-secret-change-in-production-2026-auth-jwt",
    "changeme",
    "secret",
}

if ENVIRONMENT == "production":
    if (
        not JWT_SECRET_KEY
        or len(JWT_SECRET_KEY.strip()) < 32
        or "insecure" in JWT_SECRET_KEY.lower()
        or JWT_SECRET_KEY.strip() in KNOWN_INSECURE_SECRETS
    ):
        raise RuntimeError(
            "FATAL CONFIGURATION ERROR: INSIGHTFORGE_SECRET_KEY environment variable must be set to a secure, "
            "high-entropy key (minimum 32 characters) in production environments. "
            "Fallback and default production secrets are strictly prohibited."
        )
else:
    if not JWT_SECRET_KEY:
        JWT_SECRET_KEY = "insecure-dev-secret-change-in-production-2026-auth-jwt"


JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_SECONDS = int(os.getenv("JWT_EXPIRATION_SECONDS", "86400"))  # 24 hours


def hash_password(password: str) -> str:
    """
    Hash a password using PBKDF2-HMAC-SHA256 with 100,000 iterations and 16-byte random salt.
    Format: salt$hex_hash
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Constant-time comparison verification for PBKDF2 hashed passwords.
    """
    try:
        if "$" not in hashed_password:
            return False
        salt, key_hex = hashed_password.split("$", 1)
        expected_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(expected_key.hex(), key_hex)
    except Exception:
        return False


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def base64url_decode(data_str: str) -> bytes:
    padding = "=" * ((4 - len(data_str) % 4) % 4)
    return base64.urlsafe_b64decode(data_str + padding)


def create_access_token(data: Dict[str, Any], expires_delta_seconds: Optional[int] = None) -> str:
    """
    Creates a standard tamper-evident HS256 JWT access token without external dependencies.
    """
    expires = expires_delta_seconds or JWT_EXPIRATION_SECONDS
    now = int(time.time())
    
    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    payload = {
        **data,
        "iat": now,
        "exp": now + expires,
    }

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    encoded_header = base64url_encode(header_bytes)
    encoded_payload = base64url_encode(payload_bytes)

    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_signature = base64url_encode(signature)

    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies signature and expiration of an HS256 JWT access token.
    Returns decoded payload if valid, None if invalid or expired.
    """
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None

        encoded_header, encoded_payload, encoded_signature = parts

        # Strictly verify header algorithm matches JWT_ALGORITHM
        header_bytes = base64url_decode(encoded_header)
        header = json.loads(header_bytes.decode("utf-8"))
        if header.get("alg") != JWT_ALGORITHM:
            return None

        # Verify HMAC signature in constant time
        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        expected_sig = hmac.new(JWT_SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        provided_sig = base64url_decode(encoded_signature)

        if not hmac.compare_digest(expected_sig, provided_sig):
            return None

        payload_bytes = base64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Check expiration
        now = int(time.time())
        if "exp" in payload and payload["exp"] < now:
            return None

        return payload
    except Exception:
        return None
