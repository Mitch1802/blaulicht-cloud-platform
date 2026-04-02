from __future__ import annotations

from datetime import date

from django.db.models import QuerySet

from core_apps.mitglieder.models import Mitglied

from .models import JugendAusbildung, JugendEvent, JugendEventTeilnahme

_EVENT_LEVEL_FIELDS = {
    JugendEvent.Kategorie.ERPROBUNG: {
        "prefix": "erprobung",
        "max_level": 5,
    },
    JugendEvent.Kategorie.WISSENSTEST: {
        "prefix": "wissentest",
        "max_level": 5,
    },
    JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_MELDER: {
        "spiel_field": "melder_spiel_datum",
        "abzeichen_field": "melder_datum",
    },
    JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_FWTECHNIK: {
        "spiel_field": "fwtechnik_spiel_datum",
        "abzeichen_field": "fwtechnik_datum",
    },
    JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER: {
        "spiel_field": "sicher_zu_wasser_spiel_datum",
        "abzeichen_field": "sicher_zu_wasser_datum",
    },
}


def rebuild_ausbildung_for_mitglieder(mitglied_pkids: list[int] | set[int] | tuple[int, ...]) -> None:
    pkids = {int(pkid) for pkid in mitglied_pkids if pkid is not None}
    if not pkids:
        return

    jugend_mitglieder = list(
        Mitglied.objects.filter(
            pkid__in=pkids,
            dienststatus=Mitglied.Dienststatus.JUGEND,
        )
    )
    if not jugend_mitglieder:
        return

    for mitglied in jugend_mitglieder:
        ausbildung, _ = JugendAusbildung.objects.get_or_create(mitglied=mitglied)
        _rebuild_for_mitglied(ausbildung=ausbildung, mitglied_pkid=mitglied.pkid)


def _rebuild_for_mitglied(ausbildung: JugendAusbildung, mitglied_pkid: int) -> None:
    teilnahmen = JugendEventTeilnahme.objects.filter(
        mitglied__pkid=mitglied_pkid,
        level__isnull=False,
    ).select_related("event")

    changed = False
    changed = _rebuild_prefix_levels(
        ausbildung=ausbildung,
        teilnahmen=teilnahmen,
        kategorie=JugendEvent.Kategorie.ERPROBUNG,
        prefix=str(_EVENT_LEVEL_FIELDS[JugendEvent.Kategorie.ERPROBUNG]["prefix"]),
        max_level=int(_EVENT_LEVEL_FIELDS[JugendEvent.Kategorie.ERPROBUNG]["max_level"]),
    ) or changed
    changed = _rebuild_prefix_levels(
        ausbildung=ausbildung,
        teilnahmen=teilnahmen,
        kategorie=JugendEvent.Kategorie.WISSENSTEST,
        prefix=str(_EVENT_LEVEL_FIELDS[JugendEvent.Kategorie.WISSENSTEST]["prefix"]),
        max_level=int(_EVENT_LEVEL_FIELDS[JugendEvent.Kategorie.WISSENSTEST]["max_level"]),
    ) or changed

    for kategorie in (
        JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_MELDER,
        JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_FWTECHNIK,
        JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER,
    ):
        changed = _rebuild_fertigkeitsabzeichen(
            ausbildung=ausbildung,
            teilnahmen=teilnahmen,
            kategorie=kategorie,
            spiel_field=str(_EVENT_LEVEL_FIELDS[kategorie]["spiel_field"]),
            abzeichen_field=str(_EVENT_LEVEL_FIELDS[kategorie]["abzeichen_field"]),
        ) or changed

    if changed:
        ausbildung.save()


def _rebuild_prefix_levels(
    ausbildung: JugendAusbildung,
    teilnahmen: QuerySet[JugendEventTeilnahme],
    kategorie: str,
    prefix: str,
    max_level: int,
) -> bool:
    changed = False

    for level in range(1, max_level + 1):
        level_field = f"{prefix}_lv{level}"
        date_field = f"{prefix}_lv{level}_datum"

        first_date = _get_first_event_date(
            teilnahmen=teilnahmen,
            kategorie=kategorie,
            min_level=level,
            exact_level=True,
        )
        should_be_set = first_date is not None

        current_bool = bool(getattr(ausbildung, level_field))
        if current_bool != should_be_set:
            setattr(ausbildung, level_field, should_be_set)
            changed = True

        current_date = getattr(ausbildung, date_field)
        if current_date != first_date:
            setattr(ausbildung, date_field, first_date)
            changed = True

    return changed


def _rebuild_fertigkeitsabzeichen(
    ausbildung: JugendAusbildung,
    teilnahmen: QuerySet[JugendEventTeilnahme],
    kategorie: str,
    spiel_field: str,
    abzeichen_field: str,
) -> bool:
    changed = False

    first_spiel_date = _get_first_event_date(
        teilnahmen=teilnahmen,
        kategorie=kategorie,
        min_level=1,
    )
    first_abzeichen_date = _get_first_event_date(
        teilnahmen=teilnahmen,
        kategorie=kategorie,
        min_level=2,
    )

    if getattr(ausbildung, spiel_field) != first_spiel_date:
        setattr(ausbildung, spiel_field, first_spiel_date)
        changed = True

    if getattr(ausbildung, abzeichen_field) != first_abzeichen_date:
        setattr(ausbildung, abzeichen_field, first_abzeichen_date)
        changed = True

    return changed


def _get_first_event_date(
    teilnahmen: QuerySet[JugendEventTeilnahme],
    kategorie: str,
    min_level: int,
    *,
    exact_level: bool = False,
) -> date | None:
    level_filter = {"level": min_level} if exact_level else {"level__gte": min_level}
    item = (
        teilnahmen.filter(
            event__kategorie=kategorie,
            **level_filter,
        )
        .order_by("event__datum", "event__pkid")
        .first()
    )
    if item is None:
        return None
    return item.event.datum
