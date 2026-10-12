import os
import io
import asyncio
import uuid
import json
import sqlite3
import pandas as pd
from starlette.datastructures import UploadFile
from app.db.session import SessionLocal
from app.db.models import User, Dataset, MLExperiment, Report, KnowledgeDocument, DocumentChunk
from app.core.security import create_access_token, hash_password
from app.services.dataset_service import save_and_profile_dataset, delete_dataset
from app.rag.engine import extract_text_from_file, chunk_text, index_chunks_in_chroma, delete_document_from_chroma, get_chroma_collection
from app.services.report_service import compile_report_data, generate_pdf_report

def run_deletion_verification():
    db = SessionLocal()
    print("================================================================================")
    print("STARTING INDEPENDENT MULTI-TIER DATA DELETION TEST")
    print("================================================================================")

    # 1. Create isolated test user
    test_user_id = str(uuid.uuid4())
    test_email = f"deletion_tester_{uuid.uuid4().hex[:6]}@insightforge.local"
    test_user = User(
        id=test_user_id,
        email=test_email,
        full_name="Deletion Test Subject",
        hashed_password=hash_password("SecureTestPass2026!"),
        role="tester",
    )
    db.add(test_user)
    db.commit()
    print(f"[OK] Created test user: {test_email} (ID: {test_user_id})")

    # 2. Create and persist Dataset
    sample_df = pd.DataFrame({
        "feature_a": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0],
        "feature_b": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        "target": [0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
    })
    csv_bytes = sample_df.to_csv(index=False).encode("utf-8")
    
    upload_file = UploadFile(filename="temporary_deletion_audit.csv", file=io.BytesIO(csv_bytes))
    dataset_metadata = asyncio.run(save_and_profile_dataset(file=upload_file, db=db, user_id=test_user_id))
    dataset_id = dataset_metadata["dataset_id"]
    dataset_record = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    dataset_path = dataset_record.file_path
    print(f"[OK] Created test dataset {dataset_id} at {dataset_path}")
    assert os.path.exists(dataset_path), "Dataset physical file must exist"

    # 3. Create MLExperiment linked to Dataset
    exp = MLExperiment(
        dataset_id=dataset_id,
        name="Deletion Test Experiment",
        target_column="target",
        feature_columns=["feature_a", "feature_b"],
        problem_type="classification",
        test_size=0.2,
        best_model="Random Forest",
        models_evaluated=[{"model": "Random Forest", "accuracy": 1.0}],
        metrics={"accuracy": 1.0, "primary_metric": 1.0},
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)
    exp_id = exp.id
    print(f"[OK] Created ML experiment {exp_id} for dataset {dataset_id}")

    # 4. Create Report and PDF
    report_id = str(uuid.uuid4())
    report_data = {
        "report_id": report_id,
        "dataset_name": "temporary_deletion_audit.csv",
        "generated_at": "2026-10-11T12:00:00Z",
        "metrics": {
            "total_rows": 10,
            "total_columns": 3,
            "duplicate_rows": 0,
            "health_score": 95,
            "columns_with_nulls": 0,
        },
        "executive_summary": "Test executive summary for deletion audit.",
        "ml_experiment": {"best_model": "Random Forest", "primary_metric": "1.0", "problem_type": "Classification"},
        "strategic_actions": ["Verify clean deletion of artifacts."],
        "key_takeaways": ["Artifacts must not leave orphan files on disk."],
    }
    pdf_path = generate_pdf_report(report_id, report_data)
    report = Report(
        id=report_id,
        user_id=test_user_id,
        dataset_id=dataset_id,
        title="Deletion Test Briefing",
        executive_summary="Test summary",
        content=report_data,
        pdf_path=pdf_path,
    )
    db.add(report)
    db.commit()
    print(f"[OK] Created Report {report_id} and PDF at {pdf_path}")
    assert os.path.exists(pdf_path), "Report PDF file must exist"

    # 5. Create Knowledge Document and Index Chunks in ChromaDB
    rag_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "knowledge_docs"))
    os.makedirs(rag_dir, exist_ok=True)
    doc_filename = f"deletion_doc_{uuid.uuid4().hex[:6]}.txt"
    doc_path = os.path.join(rag_dir, doc_filename)
    with open(doc_path, "w", encoding="utf-8") as f:
        f.write("InsightForge AI Deletion Protocol: Verifying zero vector embedding leakage across collections.")

    doc = KnowledgeDocument(
        user_id=test_user_id,
        filename=doc_filename,
        file_type="txt",
        file_size_bytes=len("InsightForge AI Deletion Protocol: Verifying zero vector embedding leakage across collections."),
        chunk_count=1,
        summary="Test deletion doc",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    doc_id = doc.id

    chunk = DocumentChunk(
        document_id=doc_id,
        chunk_index=0,
        content="InsightForge AI Deletion Protocol: Verifying zero vector embedding leakage across collections.",
        page_number=1,
    )
    db.add(chunk)
    db.commit()

    # Index in Chroma
    chunks_payload = [{"chunk_index": 0, "content": chunk.content, "page_number": 1}]
    chroma_ok = index_chunks_in_chroma(doc_id, doc_filename, chunks_payload)
    print(f"[OK] Created KnowledgeDocument {doc_id} with ChromaDB indexed status: {chroma_ok}")
    assert os.path.exists(doc_path), "Knowledge document physical file must exist"

    # Verify presence in ChromaDB
    collection = get_chroma_collection()
    if collection:
        c_results = collection.get(where={"document_id": doc_id})
        print(f"[VERIFY] ChromaDB records found before deletion: {len(c_results.get('ids', []))}")
        assert len(c_results.get("ids", [])) > 0, "ChromaDB should contain chunk before deletion"

    print("\n--- INITIATING MULTI-TIER DELETIONS ---\n")

    # A. Delete Report and physical PDF
    if report.pdf_path and os.path.exists(report.pdf_path):
        os.remove(report.pdf_path)
    db.delete(report)
    db.commit()
    print("[1/3] Report record and PDF file deleted.")

    # B. Delete Knowledge Document, chunks, physical file, and ChromaDB embeddings
    if os.path.exists(doc_path):
        os.remove(doc_path)
    delete_document_from_chroma(doc_id)
    db.delete(doc) # Cascade deletes DocumentChunk
    db.commit()
    print("[2/3] Knowledge document, DB chunks, file, and ChromaDB vector embeddings deleted.")

    # C. Delete Dataset, associated MLExperiments, and physical CSV
    del_res = delete_dataset(dataset_id, db, user_id=test_user_id)
    print(f"[3/3] Dataset and experiments deleted: {del_res}")

    print("\n--- VERIFYING COMPLETE REMOVAL ACROSS ALL LAYERS ---\n")

    # Layer 1: Filesystem verification
    assert not os.path.exists(dataset_path), f"ERROR: Dataset file {dataset_path} still exists on disk!"
    assert not os.path.exists(pdf_path), f"ERROR: PDF file {pdf_path} still exists on disk!"
    assert not os.path.exists(doc_path), f"ERROR: Document file {doc_path} still exists on disk!"
    print("[PASS] Filesystem: All original CSV, PDF, and text files deleted from disk.")

    # Layer 2: Relational Database verification
    assert db.query(Dataset).filter(Dataset.id == dataset_id).first() is None, "Dataset still in DB!"
    assert db.query(MLExperiment).filter(MLExperiment.dataset_id == dataset_id).first() is None, "MLExperiment still in DB!"
    assert db.query(Report).filter(Report.id == report_id).first() is None, "Report still in DB!"
    assert db.query(KnowledgeDocument).filter(KnowledgeDocument.id == doc_id).first() is None, "KnowledgeDocument still in DB!"
    assert db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).first() is None, "DocumentChunk still in DB!"
    print("[PASS] SQLite Database: All records removed from datasets, ml_experiments, reports, knowledge_documents, and document_chunks.")

    # Layer 3: ChromaDB vector store verification
    if collection:
        post_del_chroma = collection.get(where={"document_id": doc_id})
        remaining_ids = post_del_chroma.get("ids", [])
        assert len(remaining_ids) == 0, f"ERROR: ChromaDB still contains chunks: {remaining_ids}"
        print("[PASS] ChromaDB: All chunk vector embeddings purged for document ID.")

    # Clean up test user
    db.delete(test_user)
    db.commit()
    db.close()

    print("\n================================================================================")
    print("INDEPENDENT DELETION VERIFICATION RESULT: COMPLETE PASS")
    print("================================================================================")

if __name__ == "__main__":
    run_deletion_verification()
