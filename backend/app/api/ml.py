from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import MLExperiment, Dataset, User
from app.api.deps import get_current_user
from app.services.dataset_service import get_dataset_by_id
from app.services.eda_service import get_dataframe_for_dataset
from app.ml.engine import train_and_evaluate_pipeline, sanitize_json_obj

router = APIRouter(prefix="/api/ml", tags=["ml"])


class TrainRequest(BaseModel):
    target_column: str
    feature_columns: Optional[List[str]] = None
    problem_type: Optional[str] = None  # 'classification', 'regression', 'time_series'
    test_size: float = Field(0.2, ge=0.1, le=0.5)
    time_series_col: Optional[str] = None
    experiment_name: Optional[str] = None
    tune_hyperparameters: Optional[bool] = False
    cv_folds: Optional[int] = None


@router.post("/{dataset_id}/train")
def train_model_endpoint(
    dataset_id: str,
    req: TrainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Executes automated ML training, model comparisons, test evaluation,
    and SHAP explainability, persisting results in the database.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = get_dataframe_for_dataset(dataset)

    try:
        results = train_and_evaluate_pipeline(
            df=df,
            target_column=req.target_column,
            feature_columns=req.feature_columns,
            problem_type=req.problem_type,
            test_size=req.test_size,
            time_series_col=req.time_series_col,
            tune_hyperparameters=req.tune_hyperparameters or False,
            cv_folds=req.cv_folds,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ML Pipeline execution failed: {str(e)}")

    results = sanitize_json_obj(results)
    exp_name = req.experiment_name or f"{results['problem_type'].title()} — {req.target_column}"

    # Persist experiment
    exp_record = MLExperiment(
        dataset_id=dataset.id,
        name=exp_name,
        target_column=req.target_column,
        feature_columns=results["feature_columns"],
        problem_type=results["problem_type"],
        test_size=req.test_size,
        best_model=results["best_model"],
        models_evaluated=results["leaderboard"],
        hyperparameters=results.get("hyperparameters"),
        metrics=results["best_model_metrics"],
        feature_importance=results["feature_importance"],
        shap_summary=results["sample_explanations"],
        test_predictions=results["test_predictions"],
        confusion_matrix=results["confusion_matrix"],
        residuals=results["residuals"],
    )
    db.add(exp_record)
    db.commit()
    db.refresh(exp_record)

    results["experiment_id"] = exp_record.id
    results["experiment_name"] = exp_name
    return results


@router.get("/experiments/compare")
def compare_experiments(
    experiment_ids: str = Query(..., description="Comma-separated experiment IDs to compare"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compares multiple ML experiments side-by-side with metric deltas, leaderboard comparisons, and model trade-offs.
    """
    ids = [i.strip() for i in experiment_ids.split(",") if i.strip()]
    if len(ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 experiment IDs to compare.")

    experiments = (
        db.query(MLExperiment)
        .join(Dataset, MLExperiment.dataset_id == Dataset.id)
        .filter(MLExperiment.id.in_(ids), Dataset.user_id == current_user.id)
        .all()
    )
    if len(experiments) < len(ids):
        found_ids = {e.id for e in experiments}
        missing = set(ids) - found_ids
        raise HTTPException(status_code=404, detail=f"Experiments not found or access denied: {list(missing)}")

    # Comparative analysis
    comparisons = []
    for exp in experiments:
        metrics = exp.metrics or {}
        comparisons.append({
            "id": exp.id,
            "name": exp.name,
            "dataset_id": exp.dataset_id,
            "target_column": exp.target_column,
            "problem_type": exp.problem_type,
            "best_model": exp.best_model,
            "primary_metric_name": metrics.get("metric_name", "Primary Metric"),
            "primary_metric_value": metrics.get("primary_metric", 0.0),
            "cv_score": metrics.get("cv_score", 0.0),
            "accuracy": metrics.get("accuracy"),
            "f1": metrics.get("f1"),
            "rmse": metrics.get("rmse"),
            "mae": metrics.get("mae"),
            "r2": metrics.get("r2"),
            "feature_count": len(exp.feature_columns or []),
            "feature_columns": exp.feature_columns,
            "hyperparameters": exp.hyperparameters or {},
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
        })

    # Sort to determine best performer
    if comparisons[0]["problem_type"] == "classification":
        comparisons.sort(key=lambda x: x["primary_metric_value"], reverse=True)
    else:
        comparisons.sort(key=lambda x: x["primary_metric_value"], reverse=False)

    winner = comparisons[0]
    return {
        "compared_count": len(comparisons),
        "winner_id": winner["id"],
        "winner_name": winner["name"],
        "winner_model": winner["best_model"],
        "recommendation": f"Model '{winner['best_model']}' in experiment '{winner['name']}' demonstrated superior evaluation performance ({winner['primary_metric_name']}: {winner['primary_metric_value']}).",
        "experiments": comparisons,
    }


@router.get("/{dataset_id}/experiments")
def list_dataset_experiments(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves all past ML experiments performed on a dataset.
    """
    dataset = get_dataset_by_id(dataset_id, db, user_id=current_user.id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    experiments = (
        db.query(MLExperiment)
        .filter(MLExperiment.dataset_id == dataset.id)
        .order_by(MLExperiment.created_at.desc())
        .all()
    )
    return [
        {
            "id": exp.id,
            "name": exp.name,
            "target_column": exp.target_column,
            "problem_type": exp.problem_type,
            "best_model": exp.best_model,
            "metrics": exp.metrics,
            "created_at": exp.created_at.isoformat() if exp.created_at else None,
        }
        for exp in experiments
    ]


@router.get("/experiments/{experiment_id}")
def get_experiment_details(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves full metrics, predictions, confusion matrix, and SHAP explainability for an experiment.
    """
    exp = (
        db.query(MLExperiment)
        .join(Dataset, MLExperiment.dataset_id == Dataset.id)
        .filter(MLExperiment.id == experiment_id, Dataset.user_id == current_user.id)
        .first()
    )
    if not exp:
        raise HTTPException(status_code=404, detail="Experiment not found or access denied")

    return {
        "id": exp.id,
        "dataset_id": exp.dataset_id,
        "name": exp.name,
        "target_column": exp.target_column,
        "feature_columns": exp.feature_columns,
        "problem_type": exp.problem_type,
        "test_size": exp.test_size,
        "best_model": exp.best_model,
        "hyperparameters": exp.hyperparameters or {},
        "leaderboard": exp.models_evaluated,
        "best_model_metrics": exp.metrics,
        "test_predictions": exp.test_predictions,
        "confusion_matrix": exp.confusion_matrix,
        "residuals": exp.residuals,
        "feature_importance": exp.feature_importance,
        "sample_explanations": exp.shap_summary,
        "created_at": exp.created_at.isoformat() if exp.created_at else None,
    }
