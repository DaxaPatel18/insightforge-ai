from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.api.deps import get_current_user
from app.services.dataset_service import get_dataset_by_id
from app.services.eda_service import (
    get_dataframe_for_dataset,
    calculate_correlations,
    calculate_distributions_and_outliers,
    generate_automated_insights,
    apply_data_cleaning,
)

router = APIRouter(prefix="/api/eda", tags=["eda"])


@router.get("/{dataset_id}/overview")
def get_eda_overview(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns high-level statistics and schema metadata for the dataset.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {
        "dataset_id": dataset.id,
        "filename": dataset.filename,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "duplicate_rows": dataset.duplicate_rows,
        "column_info": dataset.schema_info,
        "summary_stats": dataset.summary_stats,
    }


@router.get("/{dataset_id}/correlations")
def get_eda_correlations(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns Pearson and Spearman correlation matrices.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = get_dataframe_for_dataset(dataset)
    return calculate_correlations(df)


@router.get("/{dataset_id}/distributions")
def get_eda_distributions(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns histogram bins and IQR boxplot outlier metrics for numeric columns.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = get_dataframe_for_dataset(dataset)
    return calculate_distributions_and_outliers(df)


@router.get("/{dataset_id}/insights")
def get_eda_insights(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns rule-based automated statistical insights and data health alerts.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = get_dataframe_for_dataset(dataset)
    return generate_automated_insights(df)


@router.post("/{dataset_id}/clean")
def clean_dataset_endpoint(
    dataset_id: str,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Applies data transformations (impute, drop duplicates, drop nulls, log transform, etc.)
    and records transformation audit trail.
    """
    operations = payload.get("operations", [])
    if not operations:
        raise HTTPException(status_code=400, detail="No cleaning operations provided.")

    return apply_data_cleaning(dataset_id, operations, db, user_id=current_user.id)

