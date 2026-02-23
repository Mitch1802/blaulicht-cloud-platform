from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db.utils import OperationalError, ProgrammingError

from core_apps.inventar.models import Inventar
from core_apps.news.models import News


class Command(BaseCommand):
    help = "Findet (und optional löscht) verwaiste Mediendateien für News/Inventar."

    def add_arguments(self, parser):
        parser.add_argument(
            "--target",
            choices=["all", "news", "inventar"],
            default="all",
            help="Zu prüfender Bereich (Standard: all)",
        )
        parser.add_argument(
            "--delete",
            action="store_true",
            help="Verwaiste Dateien tatsächlich löschen (Standard ist Dry-Run)",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Rückfrage vor Löschung überspringen",
        )
        parser.add_argument(
            "--allow-missing-db",
            action="store_true",
            help="Löschung trotz fehlender DB-Tabellen erlauben (unsicher)",
        )

    def handle(self, *args, **options):
        target = options["target"]
        should_delete = options["delete"]
        auto_confirm = options["yes"]
        allow_missing_db = options["allow_missing_db"]

        checks = []
        if target in ("all", "news"):
            checks.append(("news", self._news_refs))
        if target in ("all", "inventar"):
            checks.append(("inventar", self._inventar_refs))

        total_files = 0
        total_refs = 0
        total_orphans = 0
        all_orphans = []
        has_missing_db = False

        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists():
            raise CommandError(f"MEDIA_ROOT existiert nicht: {media_root}")

        for folder_name, ref_loader in checks:
            folder_path = media_root / folder_name
            if not folder_path.exists():
                self.stdout.write(self.style.WARNING(f"Übersprungen (Ordner fehlt): {folder_path}"))
                continue

            files = {file_path.name for file_path in folder_path.iterdir() if file_path.is_file()}
            refs, missing_db = ref_loader()
            has_missing_db = has_missing_db or missing_db
            orphans = sorted(files - refs)

            total_files += len(files)
            total_refs += len(refs)
            total_orphans += len(orphans)
            all_orphans.extend((folder_name, filename) for filename in orphans)

            self.stdout.write(
                f"[{folder_name}] files={len(files)} refs={len(refs)} orphan={len(orphans)}"
            )
            for filename in orphans[:20]:
                self.stdout.write(f"  - {folder_name}/{filename}")
            if len(orphans) > 20:
                self.stdout.write(f"  ... +{len(orphans) - 20} weitere")

        if should_delete and has_missing_db and not allow_missing_db:
            raise CommandError(
                "DB-Tabellen fehlen. Aus Sicherheitsgründen kein Löschlauf. "
                "Nutze erst Migrations/korrekte DB oder explizit --allow-missing-db."
            )

        if should_delete and total_orphans > 0:
            if not auto_confirm:
                answer = input(f"{total_orphans} Dateien löschen? [y/N]: ").strip().lower()
                if answer not in {"y", "yes", "j", "ja"}:
                    self.stdout.write(self.style.WARNING("Abgebrochen – keine Datei gelöscht."))
                    return

            deleted = 0
            for folder_name, filename in all_orphans:
                path = media_root / folder_name / filename
                if path.exists() and path.is_file():
                    path.unlink()
                    deleted += 1
            self.stdout.write(self.style.SUCCESS(f"Gelöscht: {deleted} Dateien"))
        elif should_delete:
            self.stdout.write(self.style.SUCCESS("Keine verwaisten Dateien zum Löschen gefunden."))
        else:
            self.stdout.write(self.style.WARNING("Dry-Run: nichts gelöscht (mit --delete löschen)."))

        self.stdout.write(
            f"Summary: files={total_files}, refs={total_refs}, orphan={total_orphans}"
        )

    def _news_refs(self):
        return self._safe_refset(News, "foto")

    def _inventar_refs(self):
        return self._safe_refset(Inventar, "foto")

    def _safe_refset(self, model_class, image_field):
        try:
            values = model_class.objects.exclude(**{f"{image_field}__isnull": True}).exclude(
                **{image_field: ""}
            ).values_list(image_field, flat=True)
            return {Path(value).name for value in values if value}, False
        except (OperationalError, ProgrammingError):
            self.stdout.write(
                self.style.WARNING(
                    f"Tabelle für {model_class.__name__} nicht verfügbar – Referenzen werden als leer behandelt."
                )
            )
            return set(), True
