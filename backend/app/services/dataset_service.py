import os
import uuid
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Dataset, DataTransformation

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB safeguard


def sanitize_val(val: Any) -> Any:
    """Helper to convert NumPy/Pandas NaN and special types to JSON-serializable types, mitigating formula injection."""
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if isinstance(val, (pd.Timestamp, datetime_type := type(pd.Timestamp.now()))):
        return str(val)
    str_val = str(val)
    # Prevent CSV / Excel formula injection if text starts with formula triggers
    if str_val.startswith(("=", "+", "-", "@", "\t", "\r")) and len(str_val) > 1 and not str_val[1:].replace(".", "", 1).isdigit():
        return f"'{str_val}"
    return str_val


def read_dataframe(file_path: str, file_format: str) -> pd.DataFrame:
    """Reads a DataFrame safely from disk based on format."""
    if file_format == "csv":
        # Handle comma, semicolon, tab delimiters gracefully
        try:
            return pd.read_csv(file_path)
        except Exception:
            return pd.read_csv(file_path, sep=None, engine="python")
    elif file_format in ["xlsx", "xls"]:
        return pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file format: {file_format}")


def compute_column_info(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Calculates column information including inferred data types, missing counts, and unique values."""
    col_info = []
    for col in df.columns:
        series = df[col]
        dtype_str = str(series.dtype)
        missing_count = int(series.isna().sum())
        unique_count = int(series.nunique(dropna=True))

        # Semantic type classification
        semantic_type = "categorical"
        if pd.api.types.is_numeric_dtype(series):
            semantic_type = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(series):
            semantic_type = "datetime"
        elif pd.api.types.is_bool_dtype(series):
            semantic_type = "boolean"
        elif unique_count > (len(df) * 0.7) and unique_count > 50:
            semantic_type = "identifier/text"

        col_info.append({
            "name": str(col),
            "dtype": dtype_str,
            "semantic_type": semantic_type,
            "missing": missing_count,
            "missing_pct": round((missing_count / max(1, len(df))) * 100, 2),
            "unique": unique_count,
        })
    return col_info


def generate_preview(df: pd.DataFrame, limit: int = 10) -> List[Dict[str, Any]]:
    """Generates sanitized JSON-serializable preview rows."""
    head_df = df.head(limit)
    records = []
    for _, row in head_df.iterrows():
        record = {}
        for col in df.columns:
            record[str(col)] = sanitize_val(row[col])
        records.append(record)
    return records


def compute_summary_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Generates comprehensive descriptive statistics for numeric and categorical columns."""
    stats: Dict[str, Any] = {"numeric": {}, "categorical": {}}

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 0:
            stats["numeric"][str(col)] = {
                "mean": sanitize_val(round(series.mean(), 4)),
                "std": sanitize_val(round(series.std(), 4)) if len(series) > 1 else 0.0,
                "min": sanitize_val(series.min()),
                "q25": sanitize_val(series.quantile(0.25)),
                "median": sanitize_val(series.median()),
                "q75": sanitize_val(series.quantile(0.75)),
                "max": sanitize_val(series.max()),
                "skew": sanitize_val(round(series.skew(), 4)) if len(series) > 2 else 0.0,
                "kurtosis": sanitize_val(round(series.kurtosis(), 4)) if len(series) > 3 else 0.0,
            }

    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()
    for col in categorical_cols:
        series = df[col].dropna().astype(str)
        if len(series) > 0:
            top_counts = series.value_counts().head(5).to_dict()
            stats["categorical"][str(col)] = {
                "unique": int(series.nunique()),
                "top_value": str(series.mode()[0]) if not series.empty else None,
                "top_frequencies": {str(k): int(v) for k, v in top_counts.items()},
            }

    return stats


async def save_and_profile_dataset(file: UploadFile, db: Session, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Validates, saves, reads, profiles, and persists an uploaded CSV/Excel file.
    Sanitizes filenames to prevent path traversal vulnerabilities.
    """
    import re
    raw_filename = file.filename or "dataset.csv"
    base_name = os.path.basename(raw_filename).strip()
    # Whitelist alphanumeric, underscore, hyphen, and period
    filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)
    if not filename or filename.startswith("."):
        filename = "dataset.csv"

    ext = filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.",
        )

    # Stream file to disk and track byte length
    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Cannot upload an empty (0 byte) file.")

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size limit of {MAX_FILE_SIZE // (1024*1024)} MB.",
        )

    dataset_id = str(uuid.uuid4())
    stored_filename = f"{dataset_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        df = read_dataframe(file_path, ext)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse tabular data: {str(e)}",
        )

    rows_count = int(len(df))
    cols_count = int(len(df.columns))
    duplicate_rows = int(df.duplicated().sum())

    column_info = compute_column_info(df)
    preview = generate_preview(df, limit=10)
    summary_stats = compute_summary_stats(df)

    # Persist in DB with user ownership
    dataset_record = Dataset(
        id=dataset_id,
        user_id=user_id,
        filename=filename,
        file_path=file_path,
        file_format=ext,
        file_size_bytes=file_size,
        rows=rows_count,
        columns=cols_count,
        duplicate_rows=duplicate_rows,
        schema_info=column_info,
        summary_stats=summary_stats,
        preview_data=preview,
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return {
        "dataset_id": dataset_id,
        "filename": filename,
        "rows": rows_count,
        "columns": cols_count,
        "size_bytes": file_size,
        "duplicate_rows": duplicate_rows,
        "column_info": column_info,
        "preview": preview,
        "summary_stats": summary_stats,
    }


def get_dataset_by_id(
    dataset_id: str,
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> Optional[Dataset]:
    """Retrieves dataset model by ID with optional user authorization check."""
    from app.db.session import SessionLocal
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        query = db.query(Dataset).filter(Dataset.id == dataset_id)
        if user_id:
            query = query.filter(Dataset.user_id == user_id)
        return query.first()
    finally:
        if close_db:
            db.close()


def get_dataset_dataframe(
    dataset_id: str,
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> Optional[pd.DataFrame]:
    """Safely retrieves the pandas DataFrame for a dataset by ID with user ownership check."""
    dataset = get_dataset_by_id(dataset_id, db, user_id=user_id)
    if not dataset or not os.path.exists(dataset.file_path):
        return None
    try:
        return read_dataframe(dataset.file_path, dataset.file_format)
    except Exception:
        return None


def list_all_datasets(db: Session, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves all persisted datasets scoped to the current user."""
    query = db.query(Dataset)
    if user_id:
        query = query.filter(Dataset.user_id == user_id)
    records = query.order_by(Dataset.created_at.desc()).all()
    return [
        {
            "dataset_id": d.id,
            "filename": d.filename,
            "file_format": d.file_format,
            "rows": d.rows,
            "columns": d.columns,
            "size_bytes": d.file_size_bytes,
            "duplicate_rows": d.duplicate_rows,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in records
    ]


def delete_dataset(dataset_id: str, db: Session, user_id: Optional[str] = None) -> bool:
    """Deletes dataset record and underlying physical file verifying ownership."""
    from app.db.models import AgentSession
    record = get_dataset_by_id(dataset_id, db, user_id=user_id)
    if not record:
        return False

    # 1. Clean up associated compiled report PDFs on disk
    if hasattr(record, "reports") and record.reports:
        for r in record.reports:
            if r.pdf_path and os.path.exists(r.pdf_path):
                try:
                    os.remove(r.pdf_path)
                except OSError:
                    pass

    # 2. Clean up associated ML model artifact files on disk
    if hasattr(record, "experiments") and record.experiments:
        for exp in record.experiments:
            if exp.artifact_path and os.path.exists(exp.artifact_path):
                try:
                    os.remove(exp.artifact_path)
                except OSError:
                    pass

    # 3. Disassociate any active agent chat sessions
    sessions = db.query(AgentSession).filter(AgentSession.dataset_id == dataset_id).all()
    for s in sessions:
        s.dataset_id = None

    # 4. Remove physical tabular dataset file
    if os.path.exists(record.file_path):
        try:
            os.remove(record.file_path)
        except OSError:
            pass

    # 5. Remove DB record (cascading transformations, experiments, analyses, reports)
    db.delete(record)
    db.commit()
    return True
