from datetime import date, timedelta

from rest_framework import permissions, filters
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend

from .models import Messgeraet, MessgeraetProtokoll
from .serializers import MessgeraetSerializer, MessgeraetProtokollSerializer
from core_apps.common.permissions import HasAnyRolePermission

    
class MessgeraetViewSet(ModelViewSet):
    queryset = Messgeraet.objects.all().order_by("inv_nr")
    serializer_class = MessgeraetSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "ATEMSCHUTZ")]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["inv_nr", "bezeichnung"]
    ordering = ["inv_nr", "bezeichnung"]

    def _add_days(self, src_date: date, days: int) -> date:
        return src_date + timedelta(days=days)

    def _add_years(self, src_date: date, years: int) -> date:
        try:
            return src_date.replace(year=src_date.year + years)
        except ValueError:
            # Handle leap-day rollover (29.02 -> 28.02)
            return src_date.replace(month=2, day=28, year=src_date.year + years)

    def _is_pruefungseintrag(self, protokoll: MessgeraetProtokoll) -> bool:
        return bool(
            protokoll.kalibrierung
            or protokoll.kontrolle_woechentlich
            or protokoll.wartung_jaehrlich
        )

    def _berechne_status(self, protokoll: MessgeraetProtokoll | None):
        if not protokoll or not protokoll.datum:
            return "", ""

        letzte_pruefung = protokoll.datum.strftime("%d.%m.%Y")
        naechste_pruefung = ""

        if protokoll.kontrolle_woechentlich:
            naechste_pruefung = self._add_days(protokoll.datum, 7).strftime("%d.%m.%Y")
        elif protokoll.wartung_jaehrlich:
            naechste_pruefung = self._add_years(protokoll.datum, 1).strftime("%d.%m.%Y")
        elif protokoll.kalibrierung:
            naechste_pruefung = self._add_years(protokoll.datum, 1).strftime("%d.%m.%Y")

        return letzte_pruefung, naechste_pruefung

    def _berechne_status_fuer_typ(self, protokoll: MessgeraetProtokoll | None, typ: str):
        if not protokoll or not protokoll.datum:
            return "", ""

        letzte_pruefung = protokoll.datum.strftime("%d.%m.%Y")

        if typ == "kalibrierung":
            naechste_pruefung = self._add_years(protokoll.datum, 1).strftime("%d.%m.%Y")
        elif typ == "kontrolle_woechentlich":
            naechste_pruefung = self._add_days(protokoll.datum, 7).strftime("%d.%m.%Y")
        elif typ == "wartung_jaehrlich":
            naechste_pruefung = self._add_years(protokoll.datum, 1).strftime("%d.%m.%Y")
        else:
            naechste_pruefung = ""

        return letzte_pruefung, naechste_pruefung

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)

        messgeraete = list(resp.data)
        geraet_pkids = [item.get("pkid") for item in messgeraete if item.get("pkid") is not None]
        latest_by_geraet = {}
        latest_by_geraet_typ = {}

        if geraet_pkids:
            protokolle = (
                MessgeraetProtokoll.objects.filter(geraet_id_id__in=geraet_pkids)
                .order_by("geraet_id_id", "-datum", "-created_at")
            )
            for eintrag in protokolle:
                if self._is_pruefungseintrag(eintrag) and eintrag.geraet_id_id not in latest_by_geraet:
                    latest_by_geraet[eintrag.geraet_id_id] = eintrag

                typ_status = latest_by_geraet_typ.setdefault(
                    eintrag.geraet_id_id,
                    {
                        "kalibrierung": None,
                        "kontrolle_woechentlich": None,
                        "wartung_jaehrlich": None,
                    },
                )

                if eintrag.kalibrierung and typ_status["kalibrierung"] is None:
                    typ_status["kalibrierung"] = eintrag
                if eintrag.kontrolle_woechentlich and typ_status["kontrolle_woechentlich"] is None:
                    typ_status["kontrolle_woechentlich"] = eintrag
                if eintrag.wartung_jaehrlich and typ_status["wartung_jaehrlich"] is None:
                    typ_status["wartung_jaehrlich"] = eintrag

        for item in messgeraete:
            letzte_pruefung = ""
            naechste_pruefung = ""
            protokoll = latest_by_geraet.get(item.get("pkid"))
            typ_status = latest_by_geraet_typ.get(item.get("pkid"), {})

            if protokoll:
                letzte_pruefung, naechste_pruefung = self._berechne_status(protokoll)

            letzte_kalibrierung, naechste_kalibrierung = self._berechne_status_fuer_typ(
                typ_status.get("kalibrierung"),
                "kalibrierung",
            )
            letzte_kontrolle, naechste_kontrolle = self._berechne_status_fuer_typ(
                typ_status.get("kontrolle_woechentlich"),
                "kontrolle_woechentlich",
            )
            letzte_wartung, naechste_wartung = self._berechne_status_fuer_typ(
                typ_status.get("wartung_jaehrlich"),
                "wartung_jaehrlich",
            )

            item["letzte_pruefung"] = letzte_pruefung
            item["naechste_pruefung"] = naechste_pruefung
            item["letzte_kalibrierung"] = letzte_kalibrierung
            item["naechste_kalibrierung"] = naechste_kalibrierung
            item["letzte_kontrolle_woechentlich"] = letzte_kontrolle
            item["naechste_kontrolle_woechentlich"] = naechste_kontrolle
            item["letzte_wartung_jaehrlich"] = letzte_wartung
            item["naechste_wartung_jaehrlich"] = naechste_wartung

        return Response(messgeraete)

class MessgeraetProtokollViewSet(ModelViewSet):
    queryset = MessgeraetProtokoll.objects.all().order_by("datum")
    serializer_class = MessgeraetProtokollSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "ATEMSCHUTZ", "PROTOKOLL")]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['geraet_id']
    ordering_fields = ["datum"]
    ordering = ["datum"]

    def _assert_protocol_editor(self, request):
        if not (hasattr(request.user, "has_any_role") and request.user.has_any_role("ADMIN", "PROTOKOLL")):
            raise PermissionDenied("Nur ADMIN oder PROTOKOLL dürfen Protokolle ändern.")

    def create(self, request, *args, **kwargs):
        self._assert_protocol_editor(request)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        self._assert_protocol_editor(request)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        self._assert_protocol_editor(request)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_protocol_editor(request)
        return super().destroy(request, *args, **kwargs)