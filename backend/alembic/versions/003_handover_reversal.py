"""handover reversal columns and audit log table

Revision ID: 003_handover_reversal
Revises: 002_supabase_admin_and_sources
Create Date: 2026-10-17 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '003_handover_reversal'
down_revision = '002_supabase_admin_and_sources'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add reversal columns to handovers table
    with op.batch_alter_table('handovers', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reversed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('reversal_reason', sa.Text(), nullable=True))

    # Create handover_audit_logs table
    op.create_table(
        'handover_audit_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('handover_id', sa.String(), nullable=False),
        sa.Column('admin_id', sa.String(), nullable=True),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('previous_status', sa.String(), nullable=True),
        sa.Column('new_status', sa.String(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['handover_id'], ['handovers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('handover_audit_logs')

    with op.batch_alter_table('handovers', schema=None) as batch_op:
        batch_op.drop_column('reversal_reason')
        batch_op.drop_column('reversed_at')
