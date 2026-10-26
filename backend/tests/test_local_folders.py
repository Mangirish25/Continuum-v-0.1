import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.db.models.all_models import Employee, EmployeeResource, KnowledgeChunk, KnowledgeDocument
from app.integrations.local_folder import LocalFolderConnector
from app.knowledge.pipeline import ingestion_pipeline
from app.knowledge.vector_store import vector_store_service


def configure_data_root(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "PROJECT_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "LOCAL_DATA_ROOT", None)
    return tmp_path / "data"


@pytest.mark.asyncio
async def test_local_connection_accepts_existing_drive_folder_and_does_not_create_folders(
    client: AsyncClient, auth_headers: dict, db_session, monkeypatch, tmp_path
):
    data_root = configure_data_root(monkeypatch, tmp_path)
    folder = data_root / "employee_1" / "drive"
    folder.mkdir(parents=True)
    employee = Employee(name="employee_1", email="employee1@example.com", role="Engineer", team="Platform")
    db_session.add(employee)
    await db_session.commit()

    response = await client.post("/api/v1/sources", headers=auth_headers, json={
        "source_type": "drive",
        "name": "employee_1 Drive",
        "local_path": "data/employee_1/drive",
        "employee_id": employee.id,
    })

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["source_type"] == "drive"
    assert data["local_path"] == "data/employee_1/drive"
    assert data["status"] == "READY"
    assert folder.is_dir()
    assert not (data_root / "employee_1" / "notion").exists()
    saved = await db_session.scalar(select(EmployeeResource).where(EmployeeResource.id == data["id"]))
    assert saved.provider == "DRIVE"
    assert saved.employee_id == employee.id


@pytest.mark.asyncio
async def test_local_connection_rejects_missing_traversal_and_outside_paths(
    client: AsyncClient, auth_headers: dict, db_session, monkeypatch, tmp_path
):
    data_root = configure_data_root(monkeypatch, tmp_path)
    data_root.mkdir()
    employee = Employee(name="Local Owner", email="owner@example.com", role="Engineer", team="Platform")
    db_session.add(employee)
    await db_session.commit()

    def payload(path):
        return {"source_type": "notion", "name": "Notion docs", "local_path": path, "employee_id": employee.id}

    missing = await client.post("/api/v1/sources", headers=auth_headers, json=payload("data/not-created/notion"))
    traversal = await client.post("/api/v1/sources", headers=auth_headers, json=payload("data/../outside"))
    outside_folder = tmp_path / "private"
    outside_folder.mkdir()
    outside = await client.post("/api/v1/sources", headers=auth_headers, json=payload(str(outside_folder)))

    assert missing.status_code == 400 and "does not exist" in missing.text
    assert traversal.status_code == 400 and "traversal" in traversal.text.lower()
    assert outside.status_code == 400 and "inside" in outside.text.lower()
    assert not (data_root / "not-created").exists()
    assert (await db_session.execute(select(EmployeeResource))).scalars().all() == []


@pytest.mark.asyncio
async def test_local_folder_connector_recurses_and_reports_supported_files(monkeypatch, tmp_path):
    data_root = configure_data_root(monkeypatch, tmp_path)
    folder = data_root / "employee_2" / "notion"
    nested = folder / "notes"
    nested.mkdir(parents=True)
    (folder / "overview.md").write_text("Continuity notes", encoding="utf-8")
    (nested / "facts.json").write_text('{"topic": "handover"}', encoding="utf-8")
    (nested / "table.csv").write_text("key,value\nowner,team", encoding="utf-8")
    (nested / "empty.txt").write_text("", encoding="utf-8")
    (nested / "ignored.exe").write_text("ignore", encoding="utf-8")

    connector = LocalFolderConnector("NOTION")
    documents = await connector.fetch_documents("data/employee_2/notion", employee_id="emp-2")

    assert {doc.external_id for doc in documents} == {"overview.md", "notes/facts.json", "notes/table.csv"}
    assert all(doc.employee_id == "emp-2" and doc.provider == "NOTION" for doc in documents)
    assert connector.discovered_paths == {"overview.md", "notes/facts.json", "notes/table.csv", "notes/empty.txt"}
    assert any(error["path"] == "notes/empty.txt" for error in connector.scan_errors)


@pytest.mark.asyncio
async def test_pipeline_indexes_updates_and_removes_local_files(monkeypatch, tmp_path, db_session):
    data_root = configure_data_root(monkeypatch, tmp_path)
    folder = data_root / "employee_3" / "drive"
    folder.mkdir(parents=True)
    document_path = folder / "notes.md"
    document_path.write_text("First handover note with several words.", encoding="utf-8")

    employee = Employee(name="Employee Three", email="employee3@example.com", role="Engineer", team="Platform")
    db_session.add(employee)
    await db_session.flush()
    source = EmployeeResource(
        employee_id=employee.id,
        provider="DRIVE",
        resource_type="FOLDER",
        external_resource_id=str(folder.resolve()),
        external_url="data/employee_3/drive",
        name="Drive notes",
        resource_metadata={"local_path": "data/employee_3/drive"},
        status="READY",
    )
    db_session.add(source)
    await db_session.commit()

    monkeypatch.setattr(ingestion_pipeline.embedding_service, "generate_embeddings", lambda texts: [[0.1] * 384 for _ in texts])
    monkeypatch.setattr(vector_store_service, "add_chunks", lambda **kwargs: None)
    monkeypatch.setattr(vector_store_service, "delete_by_document", lambda document_id: None)

    initial = await ingestion_pipeline.run_sync_for_resource(source.id, db_session)
    assert initial["status"] == "SYNCED" and initial["processed_documents"] == 1
    stored = (await db_session.execute(select(KnowledgeDocument).where(KnowledgeDocument.resource_id == source.id))).scalars().all()
    assert len(stored) == 1 and stored[0].doc_metadata["relative_path"] == "notes.md"
    assert (await db_session.execute(select(KnowledgeChunk).where(KnowledgeChunk.document_id == stored[0].id))).scalars().all()

    unchanged = await ingestion_pipeline.run_sync_for_resource(source.id, db_session)
    assert unchanged["unchanged_documents"] == 1
    document_path.write_text("Updated handover note with changed ownership context.", encoding="utf-8")
    changed = await ingestion_pipeline.run_sync_for_resource(source.id, db_session)
    assert changed["processed_documents"] == 1

    document_path.unlink()
    removed = await ingestion_pipeline.run_sync_for_resource(source.id, db_session)
    assert removed["status"] == "SYNCED"
    assert (await db_session.execute(select(KnowledgeDocument).where(KnowledgeDocument.resource_id == source.id))).scalars().all() == []
