"""Initial schema for InsightForge AI

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-10 23:51:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. datasets
    op.create_table(
        'datasets',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('file_format', sa.String(10), nullable=False, server_default='csv'),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('columns', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duplicate_rows', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('schema_info', sa.JSON(), nullable=True),
        sa.Column('summary_stats', sa.JSON(), nullable=True),
        sa.Column('preview_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 2. data_transformations
    op.create_table(
        'data_transformations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('dataset_id', sa.String(36), sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('step_number', sa.Integer(), nullable=False),
        sa.Column('operation', sa.String(100), nullable=False),
        sa.Column('description', sa.String(255), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('rows_before', sa.Integer(), nullable=False),
        sa.Column('rows_after', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 3. ml_experiments
    op.create_table(
        'ml_experiments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('dataset_id', sa.String(36), sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('target_column', sa.String(255), nullable=False),
        sa.Column('feature_columns', sa.JSON(), nullable=False),
        sa.Column('problem_type', sa.String(50), nullable=False),
        sa.Column('test_size', sa.Float(), nullable=False, server_default='0.2'),
        sa.Column('best_model', sa.String(100), nullable=False),
        sa.Column('models_evaluated', sa.JSON(), nullable=False),
        sa.Column('hyperparameters', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=False),
        sa.Column('feature_importance', sa.JSON(), nullable=True),
        sa.Column('shap_summary', sa.JSON(), nullable=True),
        sa.Column('test_predictions', sa.JSON(), nullable=True),
        sa.Column('confusion_matrix', sa.JSON(), nullable=True),
        sa.Column('residuals', sa.JSON(), nullable=True),
        sa.Column('artifact_path', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 4. analysis_history
    op.create_table(
        'analysis_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('dataset_id', sa.String(36), sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('analysis_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('insights', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 5. agent_sessions
    op.create_table(
        'agent_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False, server_default='Data Science Session'),
        sa.Column('dataset_id', sa.String(36), sa.ForeignKey('datasets.id', ondelete='SET NULL'), nullable=True),
        sa.Column('agent_role', sa.String(50), nullable=False, server_default='data_analyst'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 6. agent_messages
    op.create_table(
        'agent_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('agent_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('reasoning_steps', sa.JSON(), nullable=True),
        sa.Column('data_payload', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 7. knowledge_documents
    op.create_table(
        'knowledge_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_type', sa.String(20), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=False),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 8. document_chunks
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('document_id', sa.String(36), sa.ForeignKey('knowledge_documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('metadata_info', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 9. reports
    op.create_table(
        'reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('dataset_id', sa.String(36), sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('executive_summary', sa.Text(), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('pdf_path', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )

    # 10. system_evaluations
    op.create_table(
        'system_evaluations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('reference_id', sa.String(36), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('system_evaluations')
    op.drop_table('reports')
    op.drop_table('document_chunks')
    op.drop_table('knowledge_documents')
    op.drop_table('agent_messages')
    op.drop_table('agent_sessions')
    op.drop_table('analysis_history')
    op.drop_table('ml_experiments')
    op.drop_table('data_transformations')
    op.drop_table('datasets')
