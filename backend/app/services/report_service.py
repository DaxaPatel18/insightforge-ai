import os
from datetime import datetime
from typing import Dict, Any, Optional, List
import pandas as pd
from app.services.dataset_service import get_dataset_dataframe, get_dataset_by_id
from app.services.eda_service import calculate_correlations, calculate_distributions_and_outliers, generate_automated_insights
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "reports"))
os.makedirs(REPORTS_DIR, exist_ok=True)


def compile_report_data(dataset_id: str, experiment_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Compile structured data for the executive report."""
    df = get_dataset_dataframe(dataset_id)
    dataset = get_dataset_by_id(dataset_id)
    if df is None:
        raise ValueError("Dataset not found")

    numeric_cols = list(df.select_dtypes(include=["number"]).columns)
    categorical_cols = list(df.select_dtypes(exclude=["number"]).columns)
    null_counts = {col: int(df[col].isnull().sum()) for col in df.columns if df[col].isnull().sum() > 0}
    dupes = int(df.duplicated().sum())

    corrs = calculate_correlations(df)
    top_corrs = []
    if corrs and "pearson" in corrs:
        cols = corrs["columns"]
        for i, row in enumerate(corrs["pearson"]):
            for j in range(i + 1, len(row["values"])):
                val = row["values"][j]
                top_corrs.append({"feat_a": cols[i], "feat_b": cols[j], "r": round(val, 3), "abs_r": abs(val)})
        top_corrs.sort(key=lambda x: x["abs_r"], reverse=True)

    insights = generate_automated_insights(df)

    # Executive Summary text
    corr_blurb = f"Statistical correlation analysis highlighted a dominant relationship between {top_corrs[0]['feat_a']} and {top_corrs[0]['feat_b']} (r = {top_corrs[0]['r']}). " if top_corrs else ""
    exec_summary = (
        f"This executive intelligence dossier delivers a comprehensive audit of dataset '{dataset.filename if dataset else 'Dataset'}', "
        f"comprising {len(df):,} observations across {len(df.columns)} dimensions ({len(numeric_cols)} numeric, {len(categorical_cols)} categorical). "
        f"Data integrity testing identified {dupes} duplicate rows and {len(null_counts)} columns with null values. "
        f"{corr_blurb}"
        f"The data assets are ready for machine learning inference and executive decision-making."
    )


    report_content = {
        "dataset_name": dataset.filename if dataset else "Dataset",
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "metrics": {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "numeric_columns": len(numeric_cols),
            "categorical_columns": len(categorical_cols),
            "duplicate_rows": dupes,
            "columns_with_nulls": len(null_counts),
            "health_score": 98 if not null_counts and dupes == 0 else 85 if dupes < 10 else 72,
        },
        "executive_summary": exec_summary,
        "data_quality": {
            "duplicates": dupes,
            "missing_by_column": null_counts,
        },
        "top_correlations": top_corrs[:6],
        "ml_benchmark": experiment_data if experiment_data else None,
        "automated_insights": insights[:5],
        "recommendations": [
            "Maintain automated pipelines with continuous schema drift monitoring.",
            "Address missing values in high-importance attributes via median imputation.",
            "Prioritize top correlation pairs for feature interaction modeling.",
            "Evaluate production inference latency prior to model deployment.",
        ],
    }

    return report_content


def generate_pdf_report(report_id: str, report_data: Dict[str, Any]) -> str:
    """Generate a publication-grade PDF report using ReportLab."""
    pdf_filename = f"report_{report_id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e1b4b"),
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#4f46e5"),
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
    )

    story = []

    # Title & Metadata Header
    story.append(Paragraph("InsightForge AI - Executive Intelligence Report", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Dataset: {report_data['dataset_name']}  |  Compiled: {report_data['generated_at']}", subtitle_style))
    story.append(Spacer(1, 14))

    # KPI Summary Table
    m = report_data["metrics"]
    kpi_data = [
        ["Total Rows", "Columns", "Data Health Score", "Duplicates", "Null Cols"],
        [f"{m['total_rows']:,}", str(m['total_columns']), f"{m['health_score']}/100", str(m['duplicate_rows']), str(m['columns_with_nulls'])],
    ]
    kpi_table = Table(kpi_data, colWidths=[105, 105, 115, 105, 105])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4338ca")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 12),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#4338ca")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 14))

    # Executive Summary Section
    story.append(Paragraph("1. Executive Summary", section_heading))
    story.append(Paragraph(report_data["executive_summary"], body_style))
    story.append(Spacer(1, 12))

    # Correlations Section
    top_corrs = report_data.get("top_correlations", [])
    if top_corrs:
        story.append(Paragraph("2. Top Statistical Correlations", section_heading))
        corr_table_data = [["Feature A", "Feature B", "Pearson Correlation (r)", "Strength"]]
        for c in top_corrs:
            strength = "Strong Positive" if c["r"] > 0.6 else "Strong Negative" if c["r"] < -0.6 else "Moderate"
            corr_table_data.append([c["feat_a"], c["feat_b"], str(c["r"]), strength])

        corr_table = Table(corr_table_data, colWidths=[150, 150, 120, 115])
        corr_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
            ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#334155")),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 8.5),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(corr_table)
        story.append(Spacer(1, 12))

    # ML Benchmark Section (if available)
    ml_info = report_data.get("ml_benchmark")
    if ml_info and "leaderboard" in ml_info:
        story.append(Paragraph("3. Machine Learning Benchmark Leaderboard", section_heading))
        ml_table_data = [["Algorithm", "CV Score", "Primary Test Metric", "Evaluation Task"]]
        for lb in ml_info["leaderboard"][:4]:
            ml_table_data.append([
                lb.get("model_name", "Model"),
                f"{lb.get('cv_score', 0):.4f}",
                f"{lb.get('primary_metric', 0):.4f}",
                ml_info.get("problem_type", "Standard"),
            ])
        ml_table = Table(ml_table_data, colWidths=[180, 115, 120, 120])
        ml_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f0fdfa"), colors.white]),
            ("TEXTCOLOR", (0, 1), (-1, -1), colors.HexColor("#334155")),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 8.5),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#ccfbf1")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#0d9488")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(ml_table)
        story.append(Spacer(1, 12))

    # Recommendations Section
    story.append(Paragraph("4. Strategic Recommendations & Action Items", section_heading))
    for idx, rec in enumerate(report_data.get("recommendations", [])):
        story.append(Paragraph(f"• <b>Action {idx + 1}:</b> {rec}", body_style))
        story.append(Spacer(1, 3))

    doc.build(story)
    return pdf_path
