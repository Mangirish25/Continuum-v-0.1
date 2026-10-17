"""supabase admin and sources

Revision ID: 002_supabase_admin_and_sources
Revises: 001_initial_schema
Create Date: 2026-10-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '002_supabase_admin_and_sources'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Update admins table for Supabase Auth identity mapping
    with op.batch_alter_table('admins', schema=None) as batch_op:
        batch_op.add_column(sa.Column('supabase_user_id', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('role', sa.String(), server_default='admin', nullable=False))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False))
        batch_op.alter_column('password_hash', existing_type=sa.String(), nullable=True)
        batch_op.create_index('ix_admins_supabase_user_id', ['supabase_user_id'], unique=True)

    # 2. Update employee_resources table for enhanced sync tracking
    with op.batch_alter_table('employee_resources', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_successful_sync_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('employee_resources', schema=None) as batch_op:
        batch_op.drop_column('last_successful_sync_at')

    with op.batch_alter_table('admins', schema=None) as batch_op:
        batch_op.drop_index('ix_admins_supabase_user_id')
        batch_op.alter_column('password_hash', existing_type=sa.String(), nullable=False)
        batch_op.drop_column('is_active')
        batch_op.drop_column('role')
        batch_op.drop_column('supabase_user_id')
