import os
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404
from django.db.utils import OperationalError, ProgrammingError
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.inventar.models import Inventar
from core_apps.news.models import News


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "ja", "y", "j"}
    return bool(value)


def _safe_refset(model_class, image_field):
    try:
        values = model_class.objects.exclude(**{f"{image_field}__isnull": True}).exclude(
            **{image_field: ""}
        ).values_list(image_field, flat=True)
        return {Path(value).name for value in values if value}, False
    except (OperationalError, ProgrammingError):
        return set(), True


class BaseMediaGetFileView(APIView):
    """Basisklasse für den Dateiabruf von Mediendateien."""
    permission_classes = [permissions.IsAuthenticated]
    subdirectory = ""

    def get(self, request, filename, *args, **kwargs):
        file_path = os.path.join(settings.MEDIA_ROOT, self.subdirectory, filename)

        if not os.path.exists(file_path):
            raise Http404("Datei nicht gefunden!")

        return FileResponse(open(file_path, "rb"), as_attachment=True, filename=filename)


class MediaNewsGetFileView(BaseMediaGetFileView):
    """Abruf von News-Mediendateien."""
    permission_classes = [permissions.AllowAny]
    subdirectory = "news"

class MediaInventarGetFileView(BaseMediaGetFileView):
    """Abruf von Inventar-Mediendateien."""
    subdirectory = "inventar"


class MediaCleanupOrphansView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN")]

    def post(self, request, *args, **kwargs):
        target = request.data.get("target", "all")
        if target not in {"all", "news", "inventar"}:
            return Response({"detail": "target muss all, news oder inventar sein."}, status=status.HTTP_400_BAD_REQUEST)

        should_delete = _as_bool(request.data.get("delete", False))
        allow_missing_db = _as_bool(request.data.get("allow_missing_db", False))

        checks = []
        if target in ("all", "news"):
            checks.append(("news", lambda: _safe_refset(News, "foto")))
        if target in ("all", "inventar"):
            checks.append(("inventar", lambda: _safe_refset(Inventar, "foto")))

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            return Response({"detail": f"MEDIA_ROOT existiert nicht: {media_root}"}, status=status.HTTP_400_BAD_REQUEST)

        summary = {
            "files": 0,
            "refs": 0,
            "orphan": 0,
        }
        result = {
            "dry_run": not should_delete,
            "deleted": 0,
            "missing_db_tables": False,
            "items": [],
            "summary": summary,
        }

        all_orphans = []

        for folder_name, ref_loader in checks:
            folder_path = media_root / folder_name
            if not folder_path.exists():
                result["items"].append(
                    {
                        "target": folder_name,
                        "skipped": True,
                        "reason": f"Ordner fehlt: {folder_path}",
                        "files": 0,
                        "refs": 0,
                        "orphan": 0,
                        "orphans": [],
                    }
                )
                continue

            files = {file_path.name for file_path in folder_path.iterdir() if file_path.is_file()}
            refs, missing_db = ref_loader()
            orphans = sorted(files - refs)

            summary["files"] += len(files)
            summary["refs"] += len(refs)
            summary["orphan"] += len(orphans)
            result["missing_db_tables"] = result["missing_db_tables"] or missing_db
            all_orphans.extend((folder_name, filename) for filename in orphans)

            result["items"].append(
                {
                    "target": folder_name,
                    "skipped": False,
                    "files": len(files),
                    "refs": len(refs),
                    "orphan": len(orphans),
                    "orphans": orphans,
                }
            )

        if should_delete and result["missing_db_tables"] and not allow_missing_db:
            return Response(
                {
                    **result,
                    "detail": "DB-Tabellen fehlen. Löschung blockiert. Nutze allow_missing_db=true nur bewusst.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if should_delete:
            deleted = 0
            for folder_name, filename in all_orphans:
                file_path = media_root / folder_name / filename
                if file_path.exists() and file_path.is_file():
                    file_path.unlink()
                    deleted += 1
            result["deleted"] = deleted
            result["dry_run"] = False

        return Response(result)