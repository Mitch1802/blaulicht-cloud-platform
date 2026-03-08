from calendar import monthrange
from datetime import date, timedelta

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from core_apps.atemschutz_geraete.models import AtemschutzGeraet, AtemschutzGeraetProtokoll
from core_apps.common.permissions import HasAnyRolePermission
from core_apps.fahrzeuge.models import Fahrzeug, RaumItem
from core_apps.inventar.models import Inventar
from core_apps.messgeraete.models import Messgeraet, MessgeraetProtokoll


class WartungServiceOverviewView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "INVENTAR", "FAHRZEUG", "ATEMSCHUTZ", "PROTOKOLL"),
    ]

    def get(self, request):
        today = date.today()
        year = today.year
        entries = []

        if self._can_access(request.user, "ADMIN", "INVENTAR"):
            self._collect_inventar(entries, year, today)

        if self._can_access(request.user, "ADMIN", "FAHRZEUG"):
            self._collect_fahrzeuge(entries, year, today)

        if self._can_access(request.user, "ADMIN", "ATEMSCHUTZ", "PROTOKOLL"):
            self._collect_atemschutz_geraete(entries, year, today)
            self._collect_messgeraete(entries, year, today)

        entries.sort(
            key=lambda item: (
                self._status_priority(item["status"]),
                item["_sort_date"],
                item["modul"],
                item["eintrag"],
                item["intervall"],
            )
        )

        for item in entries:
            item.pop("_sort_date", None)

        summary = {
            "gesamt": len(entries),
            "ueberfaellig": sum(1 for x in entries if x["status"] == "ueberfaellig"),
            "heute": sum(1 for x in entries if x["status"] == "heute"),
            "anstehend": sum(1 for x in entries if x["status"] == "anstehend"),
        }

        return Response({
            "jahr": year,
            "heute": today.isoformat(),
            "summary": summary,
            "main": entries,
        })

    def _can_access(self, user, *roles):
        return hasattr(user, "has_any_role") and user.has_any_role(*roles)

    def _status_priority(self, status: str) -> int:
        order = {
            "ueberfaellig": 0,
            "heute": 1,
            "anstehend": 2,
        }
        return order.get(status, 99)

    def _status_for_date(self, due_date: date, today: date) -> str:
        if due_date < today:
            return "ueberfaellig"
        if due_date == today:
            return "heute"
        return "anstehend"

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

    def _add_date_entry(
        self,
        entries: list,
        *,
        module: str,
        area: str,
        item_label: str,
        interval_label: str,
        due_date: date | None,
        year: int,
        today: date,
        link: str,
    ):
        if due_date is None or due_date.year != year:
            return

        entries.append(
            {
                "modul": module,
                "bereich": area,
                "eintrag": item_label,
                "intervall": interval_label,
                "faelligkeit": due_date.strftime("%d.%m.%Y"),
                "status": self._status_for_date(due_date, today),
                "link": link,
                "_sort_date": due_date.isoformat(),
            }
        )

    def _add_year_entry(
        self,
        entries: list,
        *,
        module: str,
        area: str,
        item_label: str,
        interval_label: str,
        due_year: int | None,
        year: int,
        link: str,
    ):
        if due_year is None or due_year != year:
            return

        entries.append(
            {
                "modul": module,
                "bereich": area,
                "eintrag": item_label,
                "intervall": interval_label,
                "faelligkeit": str(due_year),
                "status": "anstehend",
                "link": link,
                "_sort_date": f"{due_year}-12-31",
            }
        )

    def _inventar_label(self, item: Inventar) -> str:
        return str(item.bezeichnung or f"Inventar #{item.pkid}")

    def _fahrzeug_label(self, fahrzeug: Fahrzeug) -> str:
        return str(fahrzeug.name or fahrzeug.bezeichnung or f"Fahrzeug #{fahrzeug.pkid}")

    def _raumitem_label(self, item: RaumItem) -> str:
        fahrzeug_name = self._fahrzeug_label(item.raum.fahrzeug)
        raum_name = str(item.raum.name or "Raum")
        item_name = str(item.name or f"Item #{item.pkid}")
        return f"{fahrzeug_name} - {raum_name} - {item_name}"

    def _atemschutz_geraet_label(self, item: AtemschutzGeraet) -> str:
        parts = [str(item.inv_nr or "").strip(), str(item.typ or "").strip()]
        label = " - ".join([p for p in parts if p])
        return label or f"Gerät #{item.pkid}"

    def _messgeraet_label(self, item: Messgeraet) -> str:
        parts = [str(item.inv_nr or "").strip(), str(item.bezeichnung or "").strip()]
        label = " - ".join([p for p in parts if p])
        return label or f"Messgerät #{item.pkid}"

    def _collect_inventar(self, entries: list, year: int, today: date):
        for item in Inventar.objects.exclude(wartung_naechstes_am__isnull=True).order_by("wartung_naechstes_am", "bezeichnung"):
            self._add_date_entry(
                entries,
                module="Inventar",
                area="Wartung",
                item_label=self._inventar_label(item),
                interval_label="Wartung",
                due_date=item.wartung_naechstes_am,
                year=year,
                today=today,
                link="/inventar",
            )

    def _collect_fahrzeuge(self, entries: list, year: int, today: date):
        for fahrzeug in Fahrzeug.objects.exclude(service_naechstes_am__isnull=True).order_by("service_naechstes_am", "name"):
            self._add_date_entry(
                entries,
                module="Fahrzeuge",
                area="Service",
                item_label=self._fahrzeug_label(fahrzeug),
                interval_label="Service",
                due_date=fahrzeug.service_naechstes_am,
                year=year,
                today=today,
                link="/fahrzeuge",
            )

        raum_items = (
            RaumItem.objects.select_related("raum", "raum__fahrzeug")
            .exclude(wartung_naechstes_am__isnull=True)
            .order_by("wartung_naechstes_am", "name")
        )
        for item in raum_items:
            self._add_date_entry(
                entries,
                module="Fahrzeuge",
                area="Wartung",
                item_label=self._raumitem_label(item),
                interval_label="Beladungs-Wartung",
                due_date=item.wartung_naechstes_am,
                year=year,
                today=today,
                link="/fahrzeuge",
            )

    def _collect_atemschutz_geraete(self, entries: list, year: int, today: date):
        geraete = list(AtemschutzGeraet.objects.all().order_by("inv_nr"))
        if not geraete:
            return

        geraet_ids = [g.pkid for g in geraete]
        latest_by_type: dict[int, dict[str, AtemschutzGeraetProtokoll | None]] = {}

        protokolle = (
            AtemschutzGeraetProtokoll.objects.filter(geraet_id_id__in=geraet_ids)
            .order_by("geraet_id_id", "-datum", "-created_at")
        )
        for eintrag in protokolle:
            geraet_pkid = getattr(eintrag, "geraet_id_id", None) or getattr(eintrag.geraet_id, "pkid", None)
            if geraet_pkid is None:
                continue

            state = latest_by_type.setdefault(
                geraet_pkid,
                {"monatlich": None, "jaehrlich": None, "zehnjahre": None},
            )
            if eintrag.preufung_monatlich and state["monatlich"] is None:
                state["monatlich"] = eintrag
            if eintrag.pruefung_jaehrlich and state["jaehrlich"] is None:
                state["jaehrlich"] = eintrag
            if eintrag.pruefung_10jahre and state["zehnjahre"] is None:
                state["zehnjahre"] = eintrag

        for geraet in geraete:
            label = self._atemschutz_geraet_label(geraet)
            state = latest_by_type.get(geraet.pkid, {})

            monatlich = state.get("monatlich")
            if monatlich and monatlich.datum:
                self._add_date_entry(
                    entries,
                    module="Atemschutz Geräte",
                    area="Prüfung",
                    item_label=label,
                    interval_label="Monatliche Prüfung",
                    due_date=self._add_months(monatlich.datum, 1),
                    year=year,
                    today=today,
                    link="/atemschutz/geraete",
                )

            jaehrlich = state.get("jaehrlich")
            if jaehrlich and jaehrlich.datum:
                self._add_date_entry(
                    entries,
                    module="Atemschutz Geräte",
                    area="Prüfung",
                    item_label=label,
                    interval_label="Jährliche Prüfung",
                    due_date=self._add_years(jaehrlich.datum, 1),
                    year=year,
                    today=today,
                    link="/atemschutz/geraete",
                )

            zehnjahre = state.get("zehnjahre")
            if zehnjahre and zehnjahre.datum:
                self._add_date_entry(
                    entries,
                    module="Atemschutz Geräte",
                    area="Prüfung",
                    item_label=label,
                    interval_label="10-Jahres-Prüfung",
                    due_date=self._add_years(zehnjahre.datum, 10),
                    year=year,
                    today=today,
                    link="/atemschutz/geraete",
                )

            naechste_gue = str(geraet.naechste_gue or "").strip()
            if naechste_gue.isdigit():
                self._add_year_entry(
                    entries,
                    module="Atemschutz Geräte",
                    area="Service",
                    item_label=label,
                    interval_label="Generalüberholung",
                    due_year=int(naechste_gue),
                    year=year,
                    link="/atemschutz/geraete",
                )

    def _collect_messgeraete(self, entries: list, year: int, today: date):
        geraete = list(Messgeraet.objects.all().order_by("inv_nr", "bezeichnung"))
        if not geraete:
            return

        geraet_ids = [g.pkid for g in geraete]
        latest_by_type: dict[int, dict[str, MessgeraetProtokoll | None]] = {}

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
                {
                    "kalibrierung": None,
                    "kontrolle_woechentlich": None,
                    "wartung_jaehrlich": None,
                },
            )
            if eintrag.kalibrierung and state["kalibrierung"] is None:
                state["kalibrierung"] = eintrag
            if eintrag.kontrolle_woechentlich and state["kontrolle_woechentlich"] is None:
                state["kontrolle_woechentlich"] = eintrag
            if eintrag.wartung_jaehrlich and state["wartung_jaehrlich"] is None:
                state["wartung_jaehrlich"] = eintrag

        for geraet in geraete:
            label = self._messgeraet_label(geraet)
            state = latest_by_type.get(geraet.pkid, {})

            kalibrierung = state.get("kalibrierung")
            if kalibrierung and kalibrierung.datum:
                self._add_date_entry(
                    entries,
                    module="Messgeräte",
                    area="Service",
                    item_label=label,
                    interval_label="Kalibrierung",
                    due_date=self._add_years(kalibrierung.datum, 1),
                    year=year,
                    today=today,
                    link="/atemschutz/messgeraete",
                )

            kontrolle = state.get("kontrolle_woechentlich")
            if kontrolle and kontrolle.datum:
                self._add_date_entry(
                    entries,
                    module="Messgeräte",
                    area="Wartung",
                    item_label=label,
                    interval_label="Kontrolle wöchentlich",
                    due_date=kontrolle.datum + timedelta(days=7),
                    year=year,
                    today=today,
                    link="/atemschutz/messgeraete",
                )

            wartung = state.get("wartung_jaehrlich")
            if wartung and wartung.datum:
                self._add_date_entry(
                    entries,
                    module="Messgeräte",
                    area="Wartung",
                    item_label=label,
                    interval_label="Wartung jährlich",
                    due_date=self._add_years(wartung.datum, 1),
                    year=year,
                    today=today,
                    link="/atemschutz/messgeraete",
                )
