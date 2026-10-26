import os
from pathlib import Path

from app.core.config import settings
from app.core.exceptions import BadRequestException


def resolve_local_folder(path_value: str) -> Path:
    """Resolve an explicitly configured folder and confine it to the local data root."""
    raw = Path(path_value.strip()).expanduser()
    if not path_value.strip():
        raise BadRequestException("Enter a local folder path.")
    if ".." in raw.parts:
        raise BadRequestException("Path traversal is not allowed in local folder paths.")

    data_root = settings.resolved_local_data_root
    try:
        folder = (raw if raw.is_absolute() else settings.resolved_project_root / raw).resolve(strict=True)
        root = data_root.resolve(strict=True)
    except FileNotFoundError:
        raise BadRequestException("The configured local folder does not exist. Check the path and create it manually first.")
    except OSError as exc:
        raise BadRequestException(f"The local folder cannot be accessed: {exc.strerror or 'access denied'}.")

    if folder == root or root not in folder.parents:
        raise BadRequestException("Local connections must point to a folder inside the project data/ directory.")
    if not folder.is_dir():
        raise BadRequestException("The configured local path is not a directory.")
    if not os.access(folder, os.R_OK | os.X_OK):
        raise BadRequestException("The backend does not have permission to read this folder.")
    try:
        with os.scandir(folder) as entries:
            next(entries, None)
    except OSError as exc:
        raise BadRequestException(f"The backend cannot read this folder: {exc.strerror or 'access denied'}.")
    return folder
