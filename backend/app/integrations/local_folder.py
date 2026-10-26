import csv
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import logger
from app.integrations.base import BaseConnector, NormalizedDocument
from app.knowledge.local_paths import resolve_local_folder


SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".json", ".csv"}
SKIP_NAMES = {".ds_store", "thumbs.db", "desktop.ini"}


class LocalFolderConnector(BaseConnector):
    def __init__(self, source_type: str):
        normalized = source_type.upper()
        if normalized not in {"DRIVE", "NOTION"}:
            raise ValueError("Local folder sources must be Drive or Notion.")
        self.source_type = normalized
        self.scan_errors: List[Dict[str, str]] = []
        self.discovered_paths: set[str] = set()
        self.failed_paths: set[str] = set()
        self.walk_errors: List[str] = []

    async def validate_connection(self) -> bool:
        return True

    async def list_resources(self) -> List[Dict[str, Any]]:
        return []

    def _read_file(self, file_path: Path) -> str:
        suffix = file_path.suffix.lower()
        if suffix in {".txt", ".md"}:
            return file_path.read_text(encoding="utf-8-sig")
        if suffix == ".json":
            return json.dumps(json.loads(file_path.read_text(encoding="utf-8-sig")), ensure_ascii=False, indent=2)
        if suffix == ".csv":
            with file_path.open("r", encoding="utf-8-sig", newline="") as stream:
                return "\n".join(",".join(row) for row in csv.reader(stream))
        if suffix == ".pdf":
            from pypdf import PdfReader

            return "\n".join(page.extract_text() or "" for page in PdfReader(str(file_path)).pages)
        return ""

    async def fetch_documents(self, external_resource_id: str, **kwargs) -> List[NormalizedDocument]:
        root = resolve_local_folder(external_resource_id)
        data_root = settings.resolved_local_data_root.resolve(strict=True)
        employee_id = kwargs.get("employee_id")
        project_id = kwargs.get("project_id")
        documents: List[NormalizedDocument] = []
        self.scan_errors = []
        self.discovered_paths = set()
        self.failed_paths = set()
        self.walk_errors = []
        seen_file_ids = set()

        def record_walk_error(error: OSError) -> None:
            message = error.strerror or "Directory could not be read."
            self.walk_errors.append(message)
            self.scan_errors.append({"path": Path(error.filename or root).name, "error": message})

        for current_dir, dirs, files in os.walk(root, followlinks=False, onerror=record_walk_error):
            current = Path(current_dir)
            dirs[:] = [name for name in dirs if not name.startswith(".") and not (current / name).is_symlink()]
            for filename in files:
                if filename.startswith(".") or filename.startswith("~$") or filename.lower() in SKIP_NAMES:
                    continue
                file_path = current / filename
                if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                    continue
                try:
                    resolved = file_path.resolve(strict=True)
                    if data_root not in resolved.parents:
                        self.scan_errors.append({"path": file_path.name, "error": "File link points outside the permitted data directory."})
                        continue
                    if not resolved.is_file():
                        continue
                    stat = resolved.stat()
                    identity = (stat.st_dev, stat.st_ino)
                    if identity in seen_file_ids:
                        continue
                    seen_file_ids.add(identity)
                    relative_path = resolved.relative_to(root).as_posix()
                    self.discovered_paths.add(relative_path)
                    content = self._read_file(resolved)
                    if not content.strip():
                        self.scan_errors.append({"path": relative_path, "error": "Document is empty or contains no extractable text."})
                        continue
                    documents.append(NormalizedDocument(
                        external_id=relative_path,
                        title=resolved.name,
                        content=content,
                        provider=self.source_type,
                        employee_id=employee_id,
                        project_id=project_id,
                        doc_metadata={
                            "file_name": resolved.name,
                            "relative_path": relative_path,
                            "file_size": stat.st_size,
                            "modified_at": stat.st_mtime,
                            "source_type": self.source_type,
                        },
                    ))
                except Exception as exc:
                    relative_path = file_path.relative_to(root).as_posix()
                    self.discovered_paths.add(relative_path)
                    self.failed_paths.add(relative_path)
                    self.scan_errors.append({"path": relative_path, "error": str(exc)})
                    logger.warning("Unable to index local document '%s': %s", relative_path, exc)

        return documents
