import os
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Report, Dataset, MLExperiment, User
from app.api.deps import get_current_user
from app.services.report_service import compile_report_data, generate_pdf_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportGenerateRequest(BaseModel):
    dataset_id: str
    experiment_id: Optional[str] = None
    title: Optional[str] = None


@router.post("/generate")
def create_report(
    payload: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an executive data intelligence report and create the downloadable PDF."""
    dataset = db.query(Dataset).filter(Dataset.id == payload.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found or access denied")

    experiment_data = None
    if payload.experiment_id:
        exp = (
            db.query(MLExperiment)
            .join(Dataset, MLExperiment.dataset_id == Dataset.id)
            .filter(MLExperiment.id == payload.experiment_id, Dataset.user_id == current_user.id)
            .first()
        )
        if exp:
            experiment_data = {
                "experiment_id": exp.id,
                "name": exp.name,
                "best_model": exp.best_model,
                "problem_type": exp.problem_type,
                "leaderboard": exp.models_evaluated,
                "metrics": exp.metrics,
            }
    else:
        # Check if there is an existing experiment for this dataset
        latest_exp = (
            db.query(MLExperiment)
            .filter(MLExperiment.dataset_id == payload.dataset_id)
            .order_by(MLExperiment.created_at.desc())
            .first()
        )
        if latest_exp:
            experiment_data = {
                "experiment_id": latest_exp.id,
                "name": latest_exp.name,
                "best_model": latest_exp.best_model,
                "problem_type": latest_exp.problem_type,
                "leaderboard": latest_exp.models_evaluated,
                "metrics": latest_exp.metrics,
            }

    try:
        report_data = compile_report_data(payload.dataset_id, experiment_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to compile report: {str(e)}")

    report_id = str(uuid.uuid4())
    report_title = payload.title or f"Executive Briefing: {dataset.filename}"

    # Build PDF
    pdf_path = generate_pdf_report(report_id, report_data)

    # Persist in DB scoped to current_user
    report_record = Report(
        id=report_id,
        user_id=current_user.id,
        dataset_id=payload.dataset_id,
        title=report_title,
        executive_summary=report_data["executive_summary"],
        content=report_data,
        pdf_path=pdf_path,
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    return {
        "id": report_record.id,
        "dataset_id": report_record.dataset_id,
        "title": report_record.title,
        "executive_summary": report_record.executive_summary,
        "content": report_record.content,
        "pdf_url": f"/api/reports/{report_record.id}/pdf",
        "created_at": report_record.created_at.isoformat() if report_record.created_at else None,
    }


@router.get("")
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all compiled intelligence reports for the current user."""
    reports = (
        db.query(Report)
        .filter(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    results = []
    for r in reports:
        ds_name = r.dataset.filename if r.dataset else "Dataset"
        results.append({
            "id": r.id,
            "dataset_id": r.dataset_id,
            "dataset_name": ds_name,
            "title": r.title,
            "executive_summary": r.executive_summary[:200] + "...",
            "pdf_url": f"/api/reports/{r.id}/pdf",
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })
    return results


@router.get("/{report_id}")
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve full report content by ID for the authorized user."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied")

    return {
        "id": report.id,
        "dataset_id": report.dataset_id,
        "title": report.title,
        "executive_summary": report.executive_summary,
        "content": report.content,
        "pdf_url": f"/api/reports/{report.id}/pdf",
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


@router.get("/{report_id}/pdf")
def download_report_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stream or download the compiled publication-grade PDF file."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report or not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found or access denied")

    filename = f"{report.title.replace(' ', '_').replace(':', '')}.pdf"
    return FileResponse(
        path=report.pdf_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.delete("/{report_id}")
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a report and its PDF file for the authorized user."""
    report = (
        db.query(Report)
        .filter(Report.id == report_id, Report.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or access denied")

    if report.pdf_path and os.path.exists(report.pdf_path):
        try:
            os.remove(report.pdf_path)
        except Exception:
            pass

    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}

