"""Add users, DSAR requests, and multi-tenant user_id foreign keys

Revision ID: 002_auth_and_user_relations
Revises: 001_initial_schema
Create Date: 2026-10-11 18:20:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_auth_and_user_relations'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('role', sa.String(50), nullable=False, server_default='member'),
        sa.Column('professional_role', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. Create dsar_requests table
    op.create_table(
        'dsar_requests',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('request_type', sa.String(50), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_dsar_requests_email', 'dsar_requests', ['email'], unique=False)
    op.create_index('ix_dsar_requests_user_id', 'dsar_requests', ['user_id'], unique=False)

    # 3. Add user_id column with foreign key to multi-tenant tables
    with op.batch_alter_table('datasets') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(36), nullable=True))
        batch_op.create_foreign_key('fk_datasets_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_datasets_user_id', ['user_id'])

    with op.batch_alter_table('knowledge_documents') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(36), nullable=True))
        batch_op.create_foreign_key('fk_knowledge_documents_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_knowledge_documents_user_id', ['user_id'])

    with op.batch_alter_table('agent_sessions') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(36), nullable=True))
        batch_op.create_foreign_key('fk_agent_sessions_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_agent_sessions_user_id', ['user_id'])

    with op.batch_alter_table('reports') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.String(36), nullable=True))
        batch_op.create_foreign_key('fk_reports_user_id', 'users', ['user_id'], ['id'], ondelete='SET NULL')
        batch_op.create_index('ix_reports_user_id', ['user_id'])


def downgrade() -> None:
    with op.batch_alter_table('reports') as batch_op:
        batch_op.drop_index('ix_reports_user_id')
        batch_op.drop_constraint('fk_reports_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    with op.batch_alter_table('agent_sessions') as batch_op:
        batch_op.drop_index('ix_agent_sessions_user_id')
        batch_op.drop_constraint('fk_agent_sessions_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    with op.batch_alter_table('knowledge_documents') as batch_op:
        batch_op.drop_index('ix_knowledge_documents_user_id')
        batch_op.drop_constraint('fk_knowledge_documents_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    with op.batch_alter_table('datasets') as batch_op:
        batch_op.drop_index('ix_datasets_user_id')
        batch_op.drop_constraint('fk_datasets_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')

    op.drop_index('ix_dsar_requests_user_id', table_name='dsar_requests')
    op.drop_index('ix_dsar_requests_email', table_name='dsar_requests')
    op.drop_table('dsar_requests')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
