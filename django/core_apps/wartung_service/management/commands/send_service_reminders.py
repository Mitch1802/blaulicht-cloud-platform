"""
Management-Kommando: send_service_reminders

Prüft alle Services und Wartungen, die in den nächsten 30 Tagen fällig sind,
und sendet eine Erinnerungs-E-Mail an die konfigurierte Feuerwehr-E-Mail-Adresse.

Aufruf:
    python manage.py send_service_reminders
    python manage.py send_service_reminders --days 14
    python manage.py send_service_reminders --recipient extra@feuerwehr.at
"""

from calendar import monthrange
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from core_apps.common.email import send_service_reminder_email
from core_apps.fahrzeuge.models import Fahrzeug, RaumItem
from core_apps.inventar.models import Inventar
from core_apps.konfiguration.models import Konfiguration
from core_apps.atemschutz_geraete.models import AtemschutzGeraet, AtemschutzGeraetProtokoll
from core_apps.messgeraete.models import Messgeraet, MessgeraetProtokoll


class Command(BaseCommand):
    help = "Sendet Erinnerungs-E-Mails für Services und Wartungen, die in den nächsten Tagen fällig sind."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="Erinnerungszeitraum in Tagen (Standard: 30)",
        )
        parser.add_argument(
            "--recipient",
            type=str,
            default="",
            help="Optionale Empfänger-E-Mail-Adresse (überschreibt die Konfiguration)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Keine E-Mail senden, nur Ergebnisse ausgeben",
        )

    def handle(self, *args, **options):
        days = options["days"]
        recipient_override = options["recipient"].strip()
        dry_run = options["dry_run"]

        today = date.today()
        deadline = today + timedelta(days=days)

        # Empfänger-Adresse ermitteln
        recipient = recipient_override
        fw_name = ""
        if not recipient:
            try:
                config = Konfiguration.objects.first()
                if config:
                    recipient = config.fw_email.strip()
                    fw_name = config.fw_name.strip()
            except Exception as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f"Konfiguration konnte nicht gelesen werden: {exc}"
                    )
                )

        if not recipient:
            self.stdout.write(
                self.style.ERROR(
                    "Keine Empfänger-E-Mail-Adresse gefunden. "
                    "Bitte in der Konfiguration hinterlegen oder --recipient angeben."
                )
            )
            return

        items = []
        self._collect_fahrzeuge(items, today, deadline)
        self._collect_inventar(items, today, deadline)
        self._collect_atemschutz_geraete(items, today, deadline)
        self._collect_messgeraete(items, today, deadline)

        if not items:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Keine fälligen Einträge in den nächsten {days} Tagen. Keine E-Mail gesendet."
                )
            )
            return

        self.stdout.write(f"{len(items)} fällige Einträge gefunden (nächste {days} Tage):")
        for item in items:
            self.stdout.write(
                f"  [{item['status']}] {item['modul']} / {item['bereich']} – "
                f"{item['eintrag']} ({item['intervall']}) – fällig: {item['faelligkeit']}"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-Run: keine E-Mail gesendet."))
            return

        success = send_service_reminder_email(
            recipient_email=recipient,
            items=items,
            fw_name=fw_name,
            days=days,
        )

        if success:
            self.stdout.write(
                self.style.SUCCESS(f"Erinnerungs-E-Mail an '{recipient}' gesendet.")
            )
        else:
            self.stdout.write(
                self.style.ERROR(f"Fehler beim Senden der E-Mail an '{recipient}'.")
            )

    # ------------------------------------------------------------------ helpers

    def _add_months(self, src_date: date, months: int) -> date:
        month_index = (src_date.month - 1) + months
        year = src_date.year + (month_index // 12)
        month = (month_index % 12) + 1
        day = min(src_date.day, monthrange(year, month)[1])
        return date(year, month, day)

    def _add_years(self, src_date: date, years: int) -> date:
        try:
            return src_date.replace(year=src_date.year + years)
        except ValueError:
            return src_date.replace(month=2, day=28, year=src_date.year + years)

    def _status_for_date(self, due_date: date, today: date) -> str:
        if due_date < today:
            return "ueberfaellig"
        if due_date == today:
            return "heute"
        return "anstehend"

    def _maybe_add(self, items: list, *, module: str, area: str, item_label: str,
                   interval_label: str, due_date: date | None, today: date, deadline: date):
        if due_date is None:
            return
        if due_date > deadline:
            return
        items.append({
            "modul": module,
            "bereich": area,
            "eintrag": item_label,
            "intervall": interval_label,
            "faelligkeit": due_date.strftime("%d.%m.%Y"),
            "status": self._status_for_date(due_date, today),
        })

    def _fahrzeug_label(self, fahrzeug: Fahrzeug) -> str:
        return str(fahrzeug.name or fahrzeug.bezeichnung or f"Fahrzeug #{fahrzeug.pkid}")

    def _raumitem_label(self, item: RaumItem) -> str:
        fahrzeug_name = self._fahrzeug_label(item.raum.fahrzeug)
        raum_name = str(item.raum.name or "Raum")
        item_name = str(item.name or f"Item #{item.pkid}")
        return f"{fahrzeug_name} - {raum_name} - {item_name}"

    def _collect_fahrzeuge(self, items: list, today: date, deadline: date):
        for fahrzeug in Fahrzeug.objects.exclude(service_naechstes_am__isnull=True):
            self._maybe_add(
                items,
                module="Fahrzeuge",
                area="Service",
                item_label=self._fahrzeug_label(fahrzeug),
                interval_label="Service",
                due_date=fahrzeug.service_naechstes_am,
                today=today,
                deadline=deadline,
            )

        raum_items = (
            RaumItem.objects.select_related("raum", "raum__fahrzeug")
            .exclude(wartung_naechstes_am__isnull=True)
        )
        for item in raum_items:
            self._maybe_add(
                items,
                module="Fahrzeuge",
                area="Wartung",
                item_label=self._raumitem_label(item),
                interval_label="Beladungs-Wartung",
                due_date=item.wartung_naechstes_am,
                today=today,
                deadline=deadline,
            )

    def _collect_inventar(self, items: list, today: date, deadline: date):
        for item in Inventar.objects.exclude(wartung_naechstes_am__isnull=True):
            self._maybe_add(
                items,
                module="Inventar",
                area="Wartung",
                item_label=str(item.bezeichnung or f"Inventar #{item.pkid}"),
                interval_label="Wartung",
                due_date=item.wartung_naechstes_am,
                today=today,
                deadline=deadline,
            )

    def _collect_atemschutz_geraete(self, items: list, today: date, deadline: date):
        geraete = list(AtemschutzGeraet.objects.all().order_by("inv_nr"))
        if not geraete:
            return

        geraet_ids = [g.pkid for g in geraete]
        latest_by_type: dict[int, dict] = {}

        protokolle = (
            AtemschutzGeraetProtokoll.objects.filter(geraet_id_id__in=geraet_ids)
            .order_by("geraet_id_id", "-datum", "-created_at")
        )
        for eintrag in protokolle:
            geraet_pkid = getattr(eintrag, "geraet_id_id", None) or getattr(eintrag.geraet_id, "pkid", None)
            if geraet_pkid is None:
                continue
            state = latest_by_type.setdefault(
                geraet_pkid, {"monatlich": None, "jaehrlich": None, "zehnjahre": None}
            )
            if eintrag.preufung_monatlich and state["monatlich"] is None:
                state["monatlich"] = eintrag
            if eintrag.pruefung_jaehrlich and state["jaehrlich"] is None:
                state["jaehrlich"] = eintrag
            if eintrag.pruefung_10jahre and state["zehnjahre"] is None:
                state["zehnjahre"] = eintrag

        for geraet in geraete:
            parts = [str(geraet.inv_nr or "").strip(), str(geraet.typ or "").strip()]
            label = " - ".join(p for p in parts if p) or f"Gerät #{geraet.pkid}"
            state = latest_by_type.get(geraet.pkid, {})

            monatlich = state.get("monatlich")
            if monatlich and monatlich.datum:
                self._maybe_add(items, module="Atemschutz Geräte", area="Prüfung", item_label=label,
                                interval_label="Monatliche Prüfung",
                                due_date=self._add_months(monatlich.datum, 1),
                                today=today, deadline=deadline)

            jaehrlich = state.get("jaehrlich")
            if jaehrlich and jaehrlich.datum:
                self._maybe_add(items, module="Atemschutz Geräte", area="Prüfung", item_label=label,
                                interval_label="Jährliche Prüfung",
                                due_date=self._add_years(jaehrlich.datum, 1),
                                today=today, deadline=deadline)

            zehnjahre = state.get("zehnjahre")
            if zehnjahre and zehnjahre.datum:
                self._maybe_add(items, module="Atemschutz Geräte", area="Prüfung", item_label=label,
                                interval_label="10-Jahres-Prüfung",
                                due_date=self._add_years(zehnjahre.datum, 10),
                                today=today, deadline=deadline)

    def _collect_messgeraete(self, items: list, today: date, deadline: date):
        geraete = list(Messgeraet.objects.all().order_by("inv_nr", "bezeichnung"))
        if not geraete:
            return

        geraet_ids = [g.pkid for g in geraete]
        latest_by_type: dict[int, dict] = {}

        protokolle = (
            MessgeraetProtokoll.objects.filter(geraet_id_id__in=geraet_ids)
            .order_by("geraet_id_id", "-datum", "-created_at")
        )
        for eintrag in protokolle:
            geraet_pkid = getattr(eintrag, "geraet_id_id", None) or getattr(eintrag.geraet_id, "pkid", None)
            if geraet_pkid is None:
                continue
            state = latest_by_type.setdefault(
                geraet_pkid,
                {"kalibrierung": None, "kontrolle_woechentlich": None, "wartung_jaehrlich": None},
            )
            if eintrag.kalibrierung and state["kalibrierung"] is None:
                state["kalibrierung"] = eintrag
            if eintrag.kontrolle_woechentlich and state["kontrolle_woechentlich"] is None:
                state["kontrolle_woechentlich"] = eintrag
            if eintrag.wartung_jaehrlich and state["wartung_jaehrlich"] is None:
                state["wartung_jaehrlich"] = eintrag

        for geraet in geraete:
            parts = [str(geraet.inv_nr or "").strip(), str(geraet.bezeichnung or "").strip()]
            label = " - ".join(p for p in parts if p) or f"Messgerät #{geraet.pkid}"
            state = latest_by_type.get(geraet.pkid, {})

            kalibrierung = state.get("kalibrierung")
            if kalibrierung and kalibrierung.datum:
                self._maybe_add(items, module="Messgeräte", area="Service", item_label=label,
                                interval_label="Kalibrierung",
                                due_date=self._add_years(kalibrierung.datum, 1),
                                today=today, deadline=deadline)

            kontrolle = state.get("kontrolle_woechentlich")
            if kontrolle and kontrolle.datum:
                self._maybe_add(items, module="Messgeräte", area="Wartung", item_label=label,
                                interval_label="Kontrolle wöchentlich",
                                due_date=kontrolle.datum + timedelta(days=7),
                                today=today, deadline=deadline)

            wartung = state.get("wartung_jaehrlich")
            if wartung and wartung.datum:
                self._maybe_add(items, module="Messgeräte", area="Wartung", item_label=label,
                                interval_label="Wartung jährlich",
                                due_date=self._add_years(wartung.datum, 1),
                                today=today, deadline=deadline)
