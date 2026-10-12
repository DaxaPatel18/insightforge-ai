from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.deps import get_current_user
from app.services.dataset_service import (
    save_and_profile_dataset,
    list_all_datasets,
    get_dataset_by_id,
    delete_dataset,
)

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("/upload")
async def upload_dataset_endpoint(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepts multipart/form-data with field name 'file' (CSV or Excel).
    Validates, profiles, and persists dataset scoped to current user.
    """
    return await save_and_profile_dataset(file, db, user_id=current_user.id)


@router.get("")
def list_datasets_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns list of all registered datasets belonging to the authenticated user.
    """
    return list_all_datasets(db, user_id=current_user.id)


@router.get("/{dataset_id}")
def get_dataset_endpoint(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns complete dataset schema, preview rows, and summary statistics.
    Enforces object-level authorization.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    return {
        "dataset_id": dataset.id,
        "filename": dataset.filename,
        "file_format": dataset.file_format,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "size_bytes": dataset.file_size_bytes,
        "duplicate_rows": dataset.duplicate_rows,
        "column_info": dataset.schema_info,
        "preview": dataset.preview_data,
        "summary_stats": dataset.summary_stats,
        "created_at": dataset.created_at.isoformat() if dataset.created_at else None,
        "transformations": [
            {
                "id": t.id,
                "step_number": t.step_number,
                "operation": t.operation,
                "description": t.description,
                "rows_before": t.rows_before,
                "rows_after": t.rows_after,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in dataset.transformations
        ],
    }


@router.delete("/{dataset_id}")
def delete_dataset_endpoint(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Deletes dataset and related records, verifying object ownership.
    """
    success = delete_dataset(dataset_id, db, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")
    return {"message": "Dataset successfully deleted", "dataset_id": dataset_id}
