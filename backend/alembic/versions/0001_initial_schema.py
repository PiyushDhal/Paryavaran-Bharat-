"""initial climate twin schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-13
"""

from alembic import op
import geoalchemy2
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="analyst"),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("code", sa.String(length=8), nullable=False, unique=True),
        sa.Column("centroid_lat", sa.Float(), nullable=False),
        sa.Column("centroid_lon", sa.Float(), nullable=False),
        sa.Column("boundary_geojson", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "districts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("state_id", sa.Integer(), sa.ForeignKey("states.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False, unique=True),
        sa.Column("population", sa.Integer(), nullable=False),
        sa.Column("area_sq_km", sa.Float(), nullable=False),
        sa.Column("centroid_lat", sa.Float(), nullable=False),
        sa.Column("centroid_lon", sa.Float(), nullable=False),
        sa.Column("geom", geoalchemy2.Geometry(geometry_type="MULTIPOLYGON", srid=4326), nullable=True),
        sa.Column("boundary_geojson", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_districts_state_name", "districts", ["state_id", "name"])
    op.create_index("ix_districts_geom", "districts", ["geom"], postgresql_using="gist")

    for table_name, extra_cols in {
        "weather_data": [
            sa.Column("observed_on", sa.Date(), nullable=False),
            sa.Column("rainfall_mm", sa.Float(), nullable=False),
            sa.Column("rainfall_deficit_pct", sa.Float(), nullable=False),
            sa.Column("temperature_c", sa.Float(), nullable=False),
            sa.Column("humidity_pct", sa.Float(), nullable=False),
            sa.Column("river_level_m", sa.Float(), nullable=False),
            sa.Column("soil_moisture_pct", sa.Float(), nullable=False),
            sa.Column("aqi", sa.Integer(), nullable=False),
            sa.Column("source", sa.String(length=80), nullable=False),
        ],
        "satellite_data": [
            sa.Column("observed_on", sa.Date(), nullable=False),
            sa.Column("ndvi", sa.Float(), nullable=False),
            sa.Column("land_surface_temp_c", sa.Float(), nullable=False),
            sa.Column("soil_moisture_pct", sa.Float(), nullable=False),
            sa.Column("water_body_index", sa.Float(), nullable=False),
            sa.Column("reservoir_level_pct", sa.Float(), nullable=False),
            sa.Column("source", sa.String(length=80), nullable=False),
        ],
    }.items():
        op.create_table(
            table_name,
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id"), nullable=False),
            *extra_cols,
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )

    op.create_table(
        "risk_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("valid_on", sa.Date(), nullable=False),
        sa.Column("flood_risk", sa.Float(), nullable=False),
        sa.Column("drought_risk", sa.Float(), nullable=False),
        sa.Column("heatwave_risk", sa.Float(), nullable=False),
        sa.Column("water_stress_risk", sa.Float(), nullable=False),
        sa.Column("composite_risk", sa.Float(), nullable=False),
        sa.Column("trend", sa.String(length=24), nullable=False),
        sa.Column("drivers", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "predictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("prediction_type", sa.String(length=40), nullable=False),
        sa.Column("probability", sa.Float(), nullable=False),
        sa.Column("risk_zone", sa.String(length=40), nullable=False),
        sa.Column("model_name", sa.String(length=80), nullable=False),
        sa.Column("model_version", sa.String(length=30), nullable=False),
        sa.Column("valid_for", sa.Date(), nullable=False),
        sa.Column("inputs", sa.JSON(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "simulation_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id"), nullable=True),
        sa.Column("scenario", sa.JSON(), nullable=False),
        sa.Column("results", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "chat_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "climate_alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("district_id", sa.Integer(), sa.ForeignKey("districts.id"), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False),
        sa.Column("alert_type", sa.String(length=60), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    for table in [
        "climate_alerts",
        "chat_history",
        "simulation_results",
        "predictions",
        "risk_scores",
        "satellite_data",
        "weather_data",
        "districts",
        "states",
        "users",
    ]:
        op.drop_table(table)
