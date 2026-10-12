import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    professional_role: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    professional_role: Optional[str] = None
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    professional_role: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str


class DataSummaryResponse(BaseModel):
    dataset_count: int
    total_rows: int
    total_storage_bytes: int
    report_count: int
    document_count: int


def validate_email_format(email: str) -> bool:
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    return bool(re.match(email_regex, email.strip()))


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user and returns a scoped JWT bearer token."""
    email = payload.email.strip().lower()
    if not validate_email_format(email):
        raise HTTPException(status_code=400, detail="Invalid email address format.")

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters in length for security compliance.",
        )

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip() if payload.full_name else None,
        professional_role=payload.professional_role.strip() if payload.professional_role else None,
        role="member",
        is_active=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            professional_role=user.professional_role,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates credentials and returns a scoped JWT bearer token."""
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email, User.is_active == 1).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email address or password.",
        )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            professional_role=user.professional_role,
            created_at=user.created_at.isoformat() if user.created_at else None,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user profile."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        professional_role=current_user.professional_role,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
    )


@router.put("/profile", response_model=UserResponse)
def update_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates editable personal profile details for the authenticated user."""
    if payload.full_name is not None:
        trimmed_name = payload.full_name.strip()
        current_user.full_name = trimmed_name if trimmed_name else None

    if payload.professional_role is not None:
        trimmed_role = payload.professional_role.strip()
        current_user.professional_role = trimmed_role if trimmed_role else None

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        professional_role=current_user.professional_role,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
    )


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Updates password after validating current password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password provided is incorrect.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The new password must be at least 8 characters in length.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    db.add(current_user)
    db.commit()

    return {"message": "Password successfully updated."}


@router.delete("/account")
def delete_account(
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently deletes the user account and cleans up all owned data assets."""
    import os
    from app.db.models import Dataset, Report, KnowledgeDocument
    from app.rag.engine import delete_document_from_chroma

    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password confirmation. Account deletion denied.",
        )

    # 1. Clean up physical files on disk for user datasets
    user_datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    for ds in user_datasets:
        if ds.file_path and os.path.exists(ds.file_path):
            try:
                os.remove(ds.file_path)
            except Exception:
                pass

    # 2. Clean up physical PDF reports
    user_reports = db.query(Report).filter(Report.user_id == current_user.id).all()
    for rep in user_reports:
        if rep.pdf_path and os.path.exists(rep.pdf_path):
            try:
                os.remove(rep.pdf_path)
            except Exception:
                pass

    # 3. Clean up knowledge documents and ChromaDB vector embeddings
    user_docs = db.query(KnowledgeDocument).filter(KnowledgeDocument.user_id == current_user.id).all()
    for doc in user_docs:
        try:
            delete_document_from_chroma(doc.id)
        except Exception:
            pass

    # 4. Remove user entity from database (cascades to all owned child tables)
    db.delete(current_user)
    db.commit()

    return {"message": "Account and all associated resources permanently deleted."}


@router.get("/data-summary", response_model=DataSummaryResponse)
def get_data_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns aggregated data and privacy statistics for the authenticated user's workspace."""
    from app.db.models import Dataset, Report, KnowledgeDocument
    from sqlalchemy import func

    datasets = db.query(Dataset).filter(Dataset.user_id == current_user.id).all()
    dataset_count = len(datasets)
    total_rows = sum(d.rows or 0 for d in datasets)
    total_storage = sum(d.file_size_bytes or 0 for d in datasets)

    report_count = db.query(Report).filter(Report.user_id == current_user.id).count()
    document_count = db.query(KnowledgeDocument).filter(KnowledgeDocument.user_id == current_user.id).count()

    return DataSummaryResponse(
        dataset_count=dataset_count,
        total_rows=total_rows,
        total_storage_bytes=total_storage,
        report_count=report_count,
        document_count=document_count,
    )
