import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="member")  # 'admin', 'member'
    professional_role = Column(String(100), nullable=True)
    is_active = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("KnowledgeDocument", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("AgentSession", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_format = Column(String(10), nullable=False, default="csv")
    file_size_bytes = Column(Integer, nullable=False)
    rows = Column(Integer, nullable=False, default=0)
    columns = Column(Integer, nullable=False, default=0)
    duplicate_rows = Column(Integer, nullable=False, default=0)
    schema_info = Column(JSON, nullable=True)  # List of ColumnInfo dicts
    summary_stats = Column(JSON, nullable=True)  # Descriptive statistics
    preview_data = Column(JSON, nullable=True)  # Top rows
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="datasets")
    transformations = relationship("DataTransformation", back_populates="dataset", cascade="all, delete-orphan", order_by="DataTransformation.step_number")
    experiments = relationship("MLExperiment", back_populates="dataset", cascade="all, delete-orphan", order_by="MLExperiment.created_at.desc()")
    analyses = relationship("AnalysisHistory", back_populates="dataset", cascade="all, delete-orphan", order_by="AnalysisHistory.created_at.desc()")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan", order_by="Report.created_at.desc()")


class DataTransformation(Base):
    __tablename__ = "data_transformations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    operation = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    parameters = Column(JSON, nullable=True)
    rows_before = Column(Integer, nullable=False)
    rows_after = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="transformations")


class MLExperiment(Base):
    __tablename__ = "ml_experiments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    name = Column(String(255), nullable=False)
    target_column = Column(String(255), nullable=False)
    feature_columns = Column(JSON, nullable=False)
    problem_type = Column(String(50), nullable=False)  # 'classification', 'regression', 'time_series'
    test_size = Column(Float, nullable=False, default=0.2)
    best_model = Column(String(100), nullable=False)
    models_evaluated = Column(JSON, nullable=False)  # list of model comparisons
    hyperparameters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=False)  # evaluation metrics
    feature_importance = Column(JSON, nullable=True)
    shap_summary = Column(JSON, nullable=True)
    test_predictions = Column(JSON, nullable=True)
    confusion_matrix = Column(JSON, nullable=True)
    residuals = Column(JSON, nullable=True)
    artifact_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="experiments")


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    analysis_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    insights = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="analyses")


class AgentSession(Base):
    __tablename__ = "agent_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="Data Science Session")
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=True)
    agent_role = Column(String(50), nullable=False, default="general_analyst")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("AgentMessage", back_populates="session", cascade="all, delete-orphan", order_by="AgentMessage.created_at.asc()")


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("agent_sessions.id"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    reasoning_steps = Column(JSON, nullable=True)  # List of Thought -> Tool -> Observation steps
    data_payload = Column(JSON, nullable=True)  # Optional chart spec, table, or metrics
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("AgentSession", back_populates="messages")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    chunk_count = Column(Integer, nullable=False, default=0)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan", order_by="DocumentChunk.chunk_index.asc()")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("knowledge_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    metadata_info = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("KnowledgeDocument", back_populates="chunks")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    title = Column(String(255), nullable=False)
    executive_summary = Column(Text, nullable=False)
    content = Column(JSON, nullable=False)  # Complete structured report sections
    pdf_path = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    dataset = relationship("Dataset", back_populates="reports")


class SystemEvaluation(Base):
    __tablename__ = "system_evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    category = Column(String(50), nullable=False)  # 'ml_model', 'agent_accuracy', 'rag_retrieval'
    reference_id = Column(String(36), nullable=True)  # experiment_id or session_id or doc_id
    metrics = Column(JSON, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DSARRequest(Base):
    __tablename__ = "dsar_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    request_type = Column(String(50), nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    message = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="pending")  # 'pending', 'acknowledged', 'completed'
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

