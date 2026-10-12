import os
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.db.models import Dataset, DataTransformation, AnalysisHistory
from app.services.dataset_service import (
    get_dataset_by_id,
    read_dataframe,
    compute_column_info,
    generate_preview,
    compute_summary_stats,
    sanitize_val,
)


def get_dataframe_for_dataset(dataset: Dataset) -> pd.DataFrame:
    """Reads the current DataFrame for a dataset record."""
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset physical file not found on disk.")
    return read_dataframe(dataset.file_path, dataset.file_format)


def calculate_correlations(df: pd.DataFrame) -> Dict[str, Any]:
    """Calculates Pearson and Spearman correlation matrices for numeric features."""
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.empty or len(numeric_df.columns) < 2:
        return {"columns": [], "pearson": [], "spearman": []}

    columns = [str(c) for c in numeric_df.columns]
    
    # Pearson
    pearson_matrix = numeric_df.corr(method="pearson").fillna(0).round(4)
    pearson_records = []
    for col in columns:
        row = [float(pearson_matrix.loc[col, target]) for target in columns]
        pearson_records.append({"column": col, "values": row})

    # Spearman
    spearman_matrix = numeric_df.corr(method="spearman").fillna(0).round(4)
    spearman_records = []
    for col in columns:
        row = [float(spearman_matrix.loc[col, target]) for target in columns]
        spearman_records.append({"column": col, "values": row})

    return {
        "columns": columns,
        "pearson": pearson_records,
        "spearman": spearman_records,
    }


def calculate_distributions_and_outliers(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes histogram bins and box plot IQR statistics + outlier counts for numeric columns.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    distributions = {}

    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 2:
            continue

        q1 = float(series.quantile(0.25))
        median = float(series.median())
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1
        lower_bound = q1 - (1.5 * iqr)
        upper_bound = q3 + (1.5 * iqr)

        outliers = series[(series < lower_bound) | (series > upper_bound)]
        outlier_count = int(len(outliers))

        # Histogram (10 bins)
        try:
            counts, bin_edges = np.histogram(series, bins=10)
            bins = []
            for i in range(len(counts)):
                bins.append({
                    "range": f"{round(bin_edges[i], 2)} - {round(bin_edges[i+1], 2)}",
                    "bin_start": float(bin_edges[i]),
                    "bin_end": float(bin_edges[i+1]),
                    "count": int(counts[i]),
                })
        except Exception:
            bins = []

        distributions[str(col)] = {
            "min": float(series.min()),
            "q1": q1,
            "median": median,
            "q3": q3,
            "max": float(series.max()),
            "iqr": float(iqr),
            "lower_bound": float(lower_bound),
            "upper_bound": float(upper_bound),
            "outlier_count": outlier_count,
            "outlier_percentage": round((outlier_count / len(series)) * 100, 2),
            "bins": bins,
        }

    return distributions


def generate_automated_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Generates rule-based algorithmic statistical insights from data distributions and schemas.
    """
    insights = []

    # 1. Dataset Scale Insight
    insights.append({
        "category": "scale",
        "type": "info",
        "title": "Dataset Dimensionality",
        "message": f"Dataset contains {len(df):,} observations and {len(df.columns)} features. The data size allows reliable statistical cross-validation.",
    })

    # 2. Missing Values Insights
    null_counts = df.isna().sum()
    cols_with_nulls = null_counts[null_counts > 0]
    if not cols_with_nulls.empty:
        critical_nulls = cols_with_nulls[cols_with_nulls / len(df) > 0.4]
        if not critical_nulls.empty:
            insights.append({
                "category": "data_quality",
                "type": "warning",
                "title": "High Missing Data Severity",
                "message": f"Columns {', '.join(critical_nulls.index.tolist())} have over 40% missing cells. Consider dropping or specialized imputation before training models.",
            })
        else:
            insights.append({
                "category": "data_quality",
                "type": "info",
                "title": "Moderate Missing Values",
                "message": f"{len(cols_with_nulls)} column(s) contain null values. Use the Data Cleaning toolkit to impute with mean, median, or mode.",
            })
    else:
        insights.append({
            "category": "data_quality",
            "type": "success",
            "title": "Complete Integrity",
            "message": "Zero missing values detected across all columns. Dataset is clean and ready for modeling.",
        })

    # 3. Duplicate Rows
    duplicates = int(df.duplicated().sum())
    if duplicates > 0:
        insights.append({
            "category": "data_quality",
            "type": "warning",
            "title": f"Duplicate Rows Detected ({duplicates})",
            "message": f"{duplicates} exact duplicate rows found ({round(duplicates/len(df)*100, 2)}% of dataset). Recommend pruning duplicate observations.",
        })

    # 4. Skewness Insights
    numeric_df = df.select_dtypes(include=[np.number])
    for col in numeric_df.columns:
        series = numeric_df[col].dropna()
        if len(series) > 2:
            skew = series.skew()
            if abs(skew) > 1.5:
                direction = "right-skewed (positive)" if skew > 0 else "left-skewed (negative)"
                insights.append({
                    "category": "distribution",
                    "type": "info",
                    "title": f"High Skewness in '{col}'",
                    "message": f"Feature '{col}' exhibits significant {direction} skewness (skew = {round(skew, 2)}). Applying log or power transformation can improve linear model performance.",
                })

    # 5. Multicollinearity / High Correlation Insights
    if len(numeric_df.columns) >= 2:
        corr = numeric_df.corr().abs()
        corr_vals = corr.to_numpy(copy=True)
        np.fill_diagonal(corr_vals, 0)
        high_corr_pairs = []
        for i in range(len(corr.columns)):
            for j in range(i + 1, len(corr.columns)):
                col1 = corr.columns[i]
                col2 = corr.columns[j]
                val = float(corr_vals[i, j])
                if val > 0.85:
                    high_corr_pairs.append((col1, col2, round(val, 2)))

        if high_corr_pairs:
            pair_strs = [f"{p[0]} & {p[1]} (r={p[2]})" for p in high_corr_pairs[:3]]
            insights.append({
                "category": "correlation",
                "type": "warning",
                "title": "Multicollinearity Alert",
                "message": f"Strong collinearity detected between: {', '.join(pair_strs)}. Consider feature selection or Ridge regularization to prevent variance inflation.",
            })

    # 6. Zero-variance / Constant Column Warnings
    for col in df.columns:
        if df[col].nunique(dropna=False) <= 1:
            insights.append({
                "category": "schema",
                "type": "warning",
                "title": f"Zero-Variance Feature: '{col}'",
                "message": f"Feature '{col}' has only 1 distinct value across all rows. It provides zero predictive value and should be eliminated.",
            })

    return insights


def apply_data_cleaning(
    dataset_id: str,
    operations: List[Dict[str, Any]],
    db: Session,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes a sequence of clean data transformations, records history,
    updates physical file, and recalculates schema statistics.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=user_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    df = get_dataframe_for_dataset(dataset)
    initial_rows = len(df)
    initial_cols = len(df.columns)

    transformation_records = []
    current_step = len(dataset.transformations) + 1

    for op in operations:
        action = op.get("action")
        rows_before = len(df)

        if action == "drop_duplicates":
            df = df.drop_duplicates().reset_index(drop=True)
            desc = f"Removed {rows_before - len(df)} duplicate row(s)."
        elif action == "drop_null_rows":
            threshold = op.get("threshold", None)
            columns = op.get("columns", None)
            if columns:
                df = df.dropna(subset=columns).reset_index(drop=True)
            else:
                df = df.dropna().reset_index(drop=True)
            desc = f"Dropped rows with null values ({rows_before - len(df)} rows removed)."
        elif action == "impute_missing":
            column = op.get("column")
            strategy = op.get("strategy", "mean")  # mean, median, mode, constant
            fill_value = op.get("fill_value")

            if column in df.columns:
                if strategy == "mean" and pd.api.types.is_numeric_dtype(df[column]):
                    val = df[column].mean()
                    df[column] = df[column].fillna(val)
                elif strategy == "median" and pd.api.types.is_numeric_dtype(df[column]):
                    val = df[column].median()
                    df[column] = df[column].fillna(val)
                elif strategy == "mode":
                    mode_val = df[column].mode()
                    val = mode_val[0] if not mode_val.empty else "Missing"
                    df[column] = df[column].fillna(val)
                elif strategy == "constant":
                    df[column] = df[column].fillna(fill_value)
                desc = f"Imputed missing values in '{column}' using {strategy}."
            else:
                continue
        elif action == "log_transform":
            column = op.get("column")
            if column in df.columns and pd.api.types.is_numeric_dtype(df[column]):
                # Add offset if values <= 0
                min_val = df[column].min()
                if min_val <= 0:
                    df[f"{column}_log"] = np.log1p(df[column] - min_val + 1)
                else:
                    df[f"{column}_log"] = np.log1p(df[column])
                desc = f"Applied log1p transform to '{column}' (created '{column}_log')."
            else:
                continue
        elif action == "drop_columns":
            columns_to_drop = op.get("columns", [])
            existing = [c for c in columns_to_drop if c in df.columns]
            if existing:
                df = df.drop(columns=existing)
                desc = f"Dropped column(s): {', '.join(existing)}."
            else:
                continue
        else:
            continue

        rows_after = int(len(df))
        t_record = DataTransformation(
            dataset_id=dataset.id,
            step_number=current_step,
            operation=action,
            description=desc,
            parameters=op,
            rows_before=int(rows_before),
            rows_after=int(rows_after),
        )
        db.add(t_record)
        transformation_records.append(desc)
        current_step += 1

    # Save modified DataFrame back to file
    if dataset.file_format == "csv":
        df.to_csv(dataset.file_path, index=False)
    else:
        df.to_excel(dataset.file_path, index=False)

    # Recalculate metadata
    dataset.rows = int(len(df))
    dataset.columns = int(len(df.columns))
    dataset.duplicate_rows = int(df.duplicated().sum())
    dataset.file_size_bytes = int(os.path.getsize(dataset.file_path))
    dataset.schema_info = compute_column_info(df)
    dataset.preview_data = generate_preview(df, limit=10)
    dataset.summary_stats = compute_summary_stats(df)

    db.commit()
    db.refresh(dataset)

    return {
        "message": "Dataset successfully transformed",
        "dataset_id": dataset.id,
        "rows_before": int(initial_rows),
        "rows_after": int(dataset.rows),
        "rows": int(dataset.rows),
        "columns": int(dataset.columns),
        "duplicate_rows": int(dataset.duplicate_rows),
        "transformations_applied": transformation_records,
        "transformations": [
            {
                "id": t.id,
                "step_number": t.step_number,
                "operation": t.operation,
                "description": t.description,
                "rows_before": int(t.rows_before),
                "rows_after": int(t.rows_after),
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in (dataset.transformations or [])
        ],
        "column_info": dataset.schema_info,
        "preview": dataset.preview_data,
        "summary_stats": dataset.summary_stats,
    }

