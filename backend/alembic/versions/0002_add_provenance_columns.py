"""add provenance columns

Revision ID: 0002_add_provenance_columns
Revises: 0001_initial_schema
Create Date: 2026-06-21

"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_provenance_columns'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # weather_data columns
    op.add_column('weather_data', sa.Column('dataset_version', sa.String(length=50), nullable=True))
    op.add_column('weather_data', sa.Column('last_updated', sa.DateTime(timezone=True), nullable=True))
    op.add_column('weather_data', sa.Column('ingestion_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('weather_data', sa.Column('quality_status', sa.String(length=50), nullable=True))

    # satellite_data columns
    op.add_column('satellite_data', sa.Column('dataset_version', sa.String(length=50), nullable=True))
    op.add_column('satellite_data', sa.Column('last_updated', sa.DateTime(timezone=True), nullable=True))
    op.add_column('satellite_data', sa.Column('ingestion_time', sa.DateTime(timezone=True), nullable=True))
    op.add_column('satellite_data', sa.Column('quality_status', sa.String(length=50), nullable=True))

def downgrade() -> None:
    op.drop_column('weather_data', 'dataset_version')
    op.drop_column('weather_data', 'last_updated')
    op.drop_column('weather_data', 'ingestion_time')
    op.drop_column('weather_data', 'quality_status')

    op.drop_column('satellite_data', 'dataset_version')
    op.drop_column('satellite_data', 'last_updated')
    op.drop_column('satellite_data', 'ingestion_time')
    op.drop_column('satellite_data', 'quality_status')
