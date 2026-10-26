from sqlalchemy import create_engine, inspect

from app.db.database import upgrade_existing_sqlite_schema


def test_sqlite_upgrade_adds_missing_fields_without_losing_existing_admin(tmp_path):
    database_path = tmp_path / "legacy.db"
    engine = create_engine(f"sqlite:///{database_path}")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE admins (id VARCHAR PRIMARY KEY, email VARCHAR, name VARCHAR, password_hash VARCHAR, created_at DATETIME, updated_at DATETIME)")
        connection.exec_driver_sql("INSERT INTO admins (id, email, name, password_hash) VALUES ('admin-1', 'admin@example.com', 'Admin', 'hash')")
        connection.exec_driver_sql("CREATE TABLE employee_resources (id VARCHAR PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE handovers (id VARCHAR PRIMARY KEY)")

        upgrade_existing_sqlite_schema(connection)

        admin = connection.exec_driver_sql("SELECT id, role, is_active FROM admins WHERE id='admin-1'").one()
        assert admin == ("admin-1", "admin", 1)
        assert "last_successful_sync_at" in {column["name"] for column in inspect(connection).get_columns("employee_resources")}
        assert {"reversed_at", "reversal_reason"}.issubset({column["name"] for column in inspect(connection).get_columns("handovers")})
    engine.dispose()
