import re
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import DSARRequest, User
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/contact", tags=["contact"])

VALID_REQUEST_TYPES = [
    "privacy_dsar",
    "data_correction",
    "data_erasure",
    "dpdp_grievance",
    "technical_support",
]


class DSARSubmissionRequest(BaseModel):
    request_type: str
    full_name: str
    email: str
    message: str


class DSARSubmissionResponse(BaseModel):
    success: bool
    request_id: str
    message: str
    created_at: str


@router.post("/dsar", response_model=DSARSubmissionResponse)
def submit_dsar_request(
    payload: DSARSubmissionRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Securely receives and persists a Data Subject Access Request (DSAR) or DPDP grievance notice.
    Performs input validation and records client IP for security auditability.
    """
    req_type = payload.request_type.strip().lower()
    if req_type not in VALID_REQUEST_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request category. Allowed values: {', '.join(VALID_REQUEST_TYPES)}",
        )

    name = payload.full_name.strip()
    if not name or len(name) > 255:
        raise HTTPException(status_code=400, detail="Full name is required (max 255 characters).")

    email = payload.email.strip().lower()
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Invalid email format.")

    message = payload.message.strip()
    if not message or len(message) > 5000:
        raise HTTPException(status_code=400, detail="Message is required (max 5,000 characters).")

    # Extract client IP if available
    client_ip = request.client.host if request.client else "unknown"

    # Optional user linkage if authenticated token header is provided
    user_id = None
    auth_header = request.headers.get("Authorization")
    if auth_header:
        from app.core.security import decode_access_token
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            tok_payload = decode_access_token(parts[1])
            if tok_payload and "sub" in tok_payload:
                user_id = tok_payload["sub"]

    dsar_record = DSARRequest(
        user_id=user_id,
        request_type=req_type,
        full_name=name,
        email=email,
        message=message,
        status="pending",
        ip_address=client_ip,
    )
    db.add(dsar_record)
    db.commit()
    db.refresh(dsar_record)

    return DSARSubmissionResponse(
        success=True,
        request_id=dsar_record.id,
        message="Your privacy request / inquiry notice has been securely recorded and queued for developer review.",
        created_at=dsar_record.created_at.isoformat() if dsar_record.created_at else "",
    )


@router.get("/dsar")
def list_dsar_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Administrative endpoint to inspect submitted privacy and grievance requests.
    Requires admin privileges.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative access required to inspect DSAR logs.")

    records = db.query(DSARRequest).order_by(DSARRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "request_type": r.request_type,
            "full_name": r.full_name,
            "email": r.email,
            "message": r.message,
            "status": r.status,
            "ip_address": r.ip_address,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
