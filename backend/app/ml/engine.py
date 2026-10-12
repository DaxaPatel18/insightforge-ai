import os
import uuid
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.model_selection import train_test_split, KFold, StratifiedKFold, cross_val_score, GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression, Ridge, LinearRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
)
import joblib
from pathlib import Path

MODEL_ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "models"
MODEL_ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except (ImportError, OSError, Exception):
    XGB_AVAILABLE = False

try:
    import shap
    SHAP_AVAILABLE = True
except (ImportError, OSError, Exception):
    SHAP_AVAILABLE = False


def sanitize_val(val: Any) -> Any:
    """Helper to convert NumPy/Pandas NaN and special types to JSON-serializable types."""
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
    return str(val)


def sanitize_json_obj(obj: Any) -> Any:
    """Recursively converts NaN, Inf and numpy types to standard JSON-compliant types."""
    if isinstance(obj, dict):
        return {str(k): sanitize_json_obj(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_json_obj(v) for v in obj]
    elif isinstance(obj, (float, np.floating)):
        if np.isnan(obj) or np.isinf(obj):
            return 0.0
        return float(obj)
    elif isinstance(obj, (int, np.integer)):
        return int(obj)
    elif isinstance(obj, (bool, np.bool_)):
        return bool(obj)
    elif pd.isna(obj) or obj is None:
        return None
    return obj


def build_preprocessor(numeric_features: List[str], categorical_features: List[str]) -> ColumnTransformer:
    """
    Constructs a robust scikit-learn ColumnTransformer ensuring zero data leakage.
    Imputes and standardizes numerical features; imputes and one-hot encodes categoricals.
    """
    transformers = []

    if numeric_features:
        num_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ])
        transformers.append(("num", num_transformer, numeric_features))

    if categorical_features:
        cat_transformer = Pipeline(steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ])
        transformers.append(("cat", cat_transformer, categorical_features))

    return ColumnTransformer(transformers=transformers)


def get_candidate_models(problem_type: str) -> Dict[str, Any]:
    """Returns candidate estimators according to problem type."""
    if problem_type == "classification":
        models = {
            "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
            "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42),
            "Gradient Boosting": GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42),
        }
        if XGB_AVAILABLE:
            models["XGBoost"] = xgb.XGBClassifier(n_estimators=80, max_depth=4, eval_metric="logloss", random_state=42)
        return models
    else:  # regression or time_series
        models = {
            "Ridge Regression": Ridge(alpha=1.0, random_state=42),
            "Random Forest": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
            "Gradient Boosting": GradientBoostingRegressor(n_estimators=80, max_depth=4, random_state=42),
        }
        if XGB_AVAILABLE:
            models["XGBoost"] = xgb.XGBRegressor(n_estimators=80, max_depth=4, random_state=42)
        return models


def compute_shap_explanations(
    pipeline: Pipeline,
    X_train: pd.DataFrame,
    X_test: pd.DataFrame,
    feature_names: List[str],
    problem_type: str,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Computes genuine SHAP values or falls back to permutation feature importances.
    Returns (global_importance_list, local_sample_explanations).
    """
    preprocessor = pipeline.named_steps["preprocessor"]
    model = pipeline.named_steps["model"]

    # Transform features using fitted preprocessor
    X_test_trans = preprocessor.transform(X_test)
    X_train_trans = preprocessor.transform(X_train)

    # Derive transformed feature names
    all_feature_names = []
    try:
        all_feature_names = list(preprocessor.get_feature_names_out())
        # Clean prefix "num__" or "cat__"
        all_feature_names = [f.split("__")[-1] for f in all_feature_names]
    except Exception:
        all_feature_names = [f"feat_{i}" for i in range(X_test_trans.shape[1])]

    global_shap = []
    local_samples = []

    if SHAP_AVAILABLE:
        try:
            # Use small background sample for efficiency and robustness
            bg_sample = X_train_trans[:min(50, len(X_train_trans))]
            test_subset = X_test_trans[:min(30, len(X_test_trans))]

            explainer = shap.Explainer(model, bg_sample)
            shap_values = explainer(test_subset)

            values_array = shap_values.values
            if len(values_array.shape) == 3:  # Multiclass: take class 1 or mean
                values_array = values_array[:, :, 1] if values_array.shape[2] > 1 else values_array[:, :, 0]

            # Mean absolute SHAP values across subset
            mean_abs_shap = np.mean(np.abs(values_array), axis=0)

            # Map into aggregated feature importance
            feature_scores = {}
            for idx, f_name in enumerate(all_feature_names):
                base_name = f_name.split("_")[0]  # group one-hot columns back if desired
                score = float(mean_abs_shap[idx]) if idx < len(mean_abs_shap) else 0.0
                feature_scores[f_name] = score

            # Sort descending
            sorted_feats = sorted(feature_scores.items(), key=lambda x: x[1], reverse=True)[:15]
            max_score = sorted_feats[0][1] if sorted_feats and sorted_feats[0][1] > 0 else 1.0

            for rank, (fname, score) in enumerate(sorted_feats, 1):
                global_shap.append({
                    "rank": rank,
                    "feature": fname,
                    "importance": round(score, 4),
                    "normalized_pct": round((score / max_score) * 100, 1),
                })

            # Sample individual row explanations (Top 5 test instances)
            for i in range(min(5, len(test_subset))):
                sample_contributions = []
                for j in range(min(len(all_feature_names), values_array.shape[1])):
                    sample_contributions.append({
                        "feature": all_feature_names[j],
                        "shap_value": round(float(values_array[i, j]), 4),
                    })
                # Sort by absolute contribution
                sample_contributions = sorted(sample_contributions, key=lambda x: abs(x["shap_value"]), reverse=True)[:8]
                local_samples.append({
                    "sample_index": i,
                    "top_contributions": sample_contributions,
                })

            return global_shap, local_samples
        except Exception:
            pass

    # Fallback to model feature_importances_ or coef_ if SHAP encountered dimensions mismatch
    if hasattr(model, "feature_importances_"):
        raw_imp = model.feature_importances_
        sorted_indices = np.argsort(raw_imp)[::-1][:15]
        max_val = float(np.max(raw_imp)) if len(raw_imp) > 0 and np.max(raw_imp) > 0 else 1.0
        for rank, idx in enumerate(sorted_indices, 1):
            fname = all_feature_names[idx] if idx < len(all_feature_names) else f"feature_{idx}"
            global_shap.append({
                "rank": rank,
                "feature": fname,
                "importance": round(float(raw_imp[idx]), 4),
                "normalized_pct": round((float(raw_imp[idx]) / max_val) * 100, 1),
            })
    elif hasattr(model, "coef_"):
        coef = np.abs(model.coef_).flatten()
        sorted_indices = np.argsort(coef)[::-1][:15]
        max_val = float(np.max(coef)) if len(coef) > 0 and np.max(coef) > 0 else 1.0
        for rank, idx in enumerate(sorted_indices, 1):
            fname = all_feature_names[idx] if idx < len(all_feature_names) else f"feature_{idx}"
            global_shap.append({
                "rank": rank,
                "feature": fname,
                "importance": round(float(coef[idx]), 4),
                "normalized_pct": round((float(coef[idx]) / max_val) * 100, 1),
            })

    return global_shap, local_samples


def train_and_evaluate_pipeline(
    df: pd.DataFrame,
    target_column: str,
    feature_columns: Optional[List[str]] = None,
    problem_type: Optional[str] = None,
    test_size: float = 0.2,
    time_series_col: Optional[str] = None,
    tune_hyperparameters: bool = False,
    cv_folds: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Executes automated data science pipeline:
    1. Problem type detection
    2. Zero-leakage ColumnTransformer pipeline
    3. Multi-model training and cross-validation comparison
    4. Best model selection
    5. Test set evaluation with confusion matrix / residuals
    6. SHAP explainability
    """
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found in dataset.")

    # Drop rows where target is NaN
    clean_df = df.dropna(subset=[target_column]).copy()
    if len(clean_df) < 10:
        raise ValueError("Dataset has fewer than 10 valid observations for model training.")

    # Feature selection
    if not feature_columns:
        feature_columns = [c for c in clean_df.columns if c != target_column]
    else:
        feature_columns = [c for c in feature_columns if c in clean_df.columns and c != target_column]

    if not feature_columns:
        raise ValueError("No valid predictive features selected.")

    # Auto-detect problem type if not specified
    target_series = clean_df[target_column]
    if not problem_type:
        if time_series_col and time_series_col in clean_df.columns:
            problem_type = "time_series"
        elif pd.api.types.is_numeric_dtype(target_series) and target_series.nunique() > 10:
            problem_type = "regression"
        else:
            problem_type = "classification"

    # Separate numeric and categorical predictor columns
    numeric_features = [c for c in feature_columns if pd.api.types.is_numeric_dtype(clean_df[c])]
    categorical_features = [c for c in feature_columns if c not in numeric_features]

    X = clean_df[feature_columns]
    y = clean_df[target_column]

    # Split: Chronological for time_series, Stratified for classification, Random for regression
    if problem_type == "time_series":
        if time_series_col and time_series_col in clean_df.columns:
            clean_df = clean_df.sort_values(by=time_series_col)
            X = clean_df[feature_columns]
            y = clean_df[target_column]
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    elif problem_type == "classification":
        # Check if stratification is feasible
        class_counts = y.value_counts()
        n_classes = len(class_counts)
        test_samples = int(np.ceil(len(X) * test_size))
        train_samples = len(X) - test_samples
        can_stratify = (
            class_counts.min() >= 2
            and test_samples >= n_classes
            and train_samples >= n_classes
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y if can_stratify else None
        )
    else:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

    preprocessor = build_preprocessor(numeric_features, categorical_features)
    candidate_models = get_candidate_models(problem_type)

    model_leaderboard = []
    trained_pipelines = {}

    # Cross-validation folds
    cv: Optional[int] = cv_folds if (cv_folds and cv_folds >= 2) else (3 if len(X_train) < 50 else 5)
    if problem_type == "classification":
        train_class_counts = y_train.value_counts()
        min_class_samples = int(train_class_counts.min()) if not train_class_counts.empty else 1
        if min_class_samples < (cv or 2):
            cv = max(2, min_class_samples) if min_class_samples >= 2 else None
    if cv and len(X_train) < cv:
        cv = None

    TUNING_GRIDS = {
        "Random Forest": {
            "model__n_estimators": [50, 100],
            "model__max_depth": [None, 8],
        },
        "Gradient Boosting": {
            "model__n_estimators": [50, 100],
            "model__learning_rate": [0.05, 0.1],
        },
        "Logistic Regression": {
            "model__C": [0.1, 1.0, 5.0],
        },
        "Ridge Regression": {
            "model__alpha": [0.1, 1.0, 10.0],
        },
    }

    for model_name, estimator in candidate_models.items():
        pipe = Pipeline(steps=[
            ("preprocessor", preprocessor),
            ("model", estimator),
        ])

        try:
            # Cross-validation score
            scoring = "f1_weighted" if problem_type == "classification" else "neg_root_mean_squared_error"
            if tune_hyperparameters and model_name in TUNING_GRIDS and cv and cv >= 2:
                grid = GridSearchCV(pipe, TUNING_GRIDS[model_name], cv=cv, scoring=scoring, n_jobs=1)
                grid.fit(X_train, y_train)
                pipe = grid.best_estimator_
                mean_cv = float(grid.best_score_)
                std_cv = float(grid.cv_results_["std_test_score"][grid.best_index_])
            elif cv and cv >= 2:
                cv_scores = cross_val_score(pipe, X_train, y_train, cv=cv, scoring=scoring)
                mean_cv = float(np.mean(cv_scores))
                std_cv = float(np.std(cv_scores))
                pipe.fit(X_train, y_train)
            else:
                mean_cv = 0.0
                std_cv = 0.0
                pipe.fit(X_train, y_train)

            trained_pipelines[model_name] = pipe

            # Holdout evaluation
            y_pred = pipe.predict(X_test)

            if problem_type == "classification":
                acc = float(accuracy_score(y_test, y_pred))
                f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
                precision = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
                recall = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))

                model_leaderboard.append({
                    "model_name": model_name,
                    "cv_score": round(mean_cv, 4),
                    "cv_std": round(std_cv, 4),
                    "primary_metric": round(f1, 4),
                    "metric_name": "F1-Score (Weighted)",
                    "accuracy": round(acc, 4),
                    "f1": round(f1, 4),
                    "precision": round(precision, 4),
                    "recall": round(recall, 4),
                })
            else:
                mse = float(mean_squared_error(y_test, y_pred))
                rmse = float(np.sqrt(mse))
                mae = float(mean_absolute_error(y_test, y_pred))
                r2 = float(r2_score(y_test, y_pred))

                model_leaderboard.append({
                    "model_name": model_name,
                    "cv_score": round(abs(mean_cv), 4),
                    "cv_std": round(std_cv, 4),
                    "primary_metric": round(rmse, 4),
                    "metric_name": "RMSE (Root Mean Sq Error)",
                    "rmse": round(rmse, 4),
                    "mae": round(mae, 4),
                    "r2": round(r2, 4),
                })
        except Exception as e:
            continue

    if not model_leaderboard:
        raise RuntimeError("Failed to fit candidate models on the provided dataset.")

    # Rank leaderboard: For classification, highest F1; for regression, lowest RMSE
    if problem_type == "classification":
        model_leaderboard.sort(key=lambda m: m["primary_metric"], reverse=True)
    else:
        model_leaderboard.sort(key=lambda m: m["primary_metric"], reverse=False)

    best_model_info = model_leaderboard[0]
    best_model_name = best_model_info["model_name"]
    best_pipeline = trained_pipelines[best_model_name]

    # Persist trained model artifact for inference API
    artifact_id = str(uuid.uuid4())
    artifact_path = str(MODEL_ARTIFACTS_DIR / f"{artifact_id}.joblib")
    try:
        joblib.dump(best_pipeline, artifact_path)
    except Exception:
        artifact_path = None

    # Test set predictions breakdown
    test_preds = best_pipeline.predict(X_test)
    prediction_samples = []
    for i in range(min(15, len(X_test))):
        prediction_samples.append({
            "index": int(i + 1),
            "actual": sanitize_val(y_test.iloc[i]),
            "predicted": sanitize_val(test_preds[i]),
            "error": sanitize_val(round(float(test_preds[i]) - float(y_test.iloc[i]), 4)) if problem_type != "classification" else None,
        })

    # Confusion matrix (for classification)
    conf_matrix_data = None
    if problem_type == "classification":
        labels = sorted(list(set(y_test.unique()) | set(test_preds)))
        cm = confusion_matrix(y_test, test_preds, labels=labels)
        conf_matrix_data = {
            "labels": [str(l) for l in labels],
            "matrix": cm.tolist(),
        }

    # Residuals distribution (for regression)
    residuals_data = None
    if problem_type in ["regression", "time_series"]:
        residuals = (test_preds - y_test).values
        residuals_data = {
            "mean_residual": round(float(np.mean(residuals)), 4),
            "std_residual": round(float(np.std(residuals)), 4),
            "scatter": [
                {"actual": float(y_test.iloc[k]), "predicted": float(test_preds[k]), "residual": round(float(residuals[k]), 4)}
                for k in range(min(30, len(residuals)))
            ],
        }

    # Explainable AI: SHAP global & sample feature importance
    global_shap, local_shap = compute_shap_explanations(
        best_pipeline, X_train, X_test, feature_columns, problem_type
    )

    # Best model hyperparameters extraction
    best_estimator = best_pipeline.named_steps.get("model")
    extracted_hyperparameters = {}
    if hasattr(best_estimator, "get_params"):
        raw_params = best_estimator.get_params()
        for k, v in raw_params.items():
            if isinstance(v, (int, float, str, bool)) or v is None:
                extracted_hyperparameters[k] = v

    return sanitize_json_obj({
        "problem_type": problem_type,
        "target_column": target_column,
        "feature_columns": feature_columns,
        "test_size": test_size,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "best_model": best_model_name,
        "hyperparameters": extracted_hyperparameters,
        "leaderboard": model_leaderboard,
        "best_model_metrics": best_model_info,
        "test_predictions": prediction_samples,
        "confusion_matrix": conf_matrix_data,
        "residuals": residuals_data,
        "feature_importance": global_shap,
        "sample_explanations": local_shap,
        "artifact_path": artifact_path,
    })


def predict_with_pipeline(
    pipeline_path: str,
    feature_columns: List[str],
    input_records: List[Dict[str, Any]],
    problem_type: str = "classification",
) -> Dict[str, Any]:
    """
    Loads saved scikit-learn/XGBoost pipeline and computes inference on new input records.
    """
    if not os.path.exists(pipeline_path):
        raise FileNotFoundError(f"Model artifact not found at {pipeline_path}")

    pipe = joblib.load(pipeline_path)
    df_input = pd.DataFrame(input_records)

    # Ensure all required feature columns are present, fill missing with None/NaN
    for col in feature_columns:
        if col not in df_input.columns:
            df_input[col] = np.nan

    X_in = df_input[feature_columns]
    preds = pipe.predict(X_in)

    probabilities = None
    if problem_type == "classification" and hasattr(pipe, "predict_proba"):
        try:
            probabilities = pipe.predict_proba(X_in).tolist()
        except Exception:
            probabilities = None

    results = []
    for i in range(len(df_input)):
        res_item: Dict[str, Any] = {
            "index": i,
            "prediction": sanitize_val(preds[i]),
        }
        if probabilities is not None and i < len(probabilities):
            res_item["probabilities"] = [round(float(p), 4) for p in probabilities[i]]
        results.append(res_item)

    return {
        "problem_type": problem_type,
        "total_predictions": len(results),
        "predictions": results,
    }
