from calendar import monthrange
from datetime import date

from rest_framework import permissions, filters
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.exceptions import PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend

from .models import AtemschutzGeraet, AtemschutzGeraetProtokoll
from .serializers import AtemschutzGeraetSerializer, AtemschutzGeraetProtokollSerializer
from core_apps.common.permissions import HasAnyRolePermission
from core_apps.fmd.models import FMD
from core_apps.fmd.serializers import FMDSerializer
from core_apps.mitglieder.models import Mitglied
from core_apps.mitglieder.serializers import MitgliedSerializer
    
class AtemschutzGeraeteViewSet(ModelViewSet):
    queryset = AtemschutzGeraet.objects.all().order_by("inv_nr")
    serializer_class = AtemschutzGeraetSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "ATEMSCHUTZ")]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["inv_nr", "art", "typ"]
    ordering = ["inv_nr", "art", "typ"]

    def _is_pruefungseintrag(self, protokoll: AtemschutzGeraetProtokoll) -> bool:
        return bool(
            protokoll.pruefung_10jahre
            or protokoll.pruefung_jaehrlich
            or protokoll.preufung_monatlich
        )

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
            # Handle leap-day rollover (29.02 -> 28.02)
            return src_date.replace(month=2, day=28, year=src_date.year + years)

    def _berechne_pruefungsstatus(self, protokoll: AtemschutzGeraetProtokoll | None):
        if not protokoll or not protokoll.datum:
            return "", ""

        letzte_pruefung = protokoll.datum.strftime("%d.%m.%Y")
        naechste_pruefung = ""

        if protokoll.pruefung_10jahre:
            naechste_pruefung = self._add_years(protokoll.datum, 10).strftime("%d.%m.%Y")
        elif protokoll.pruefung_jaehrlich:
            naechste_pruefung = self._add_years(protokoll.datum, 1).strftime("%d.%m.%Y")
        elif protokoll.preufung_monatlich:
            naechste_pruefung = self._add_months(protokoll.datum, 1).strftime("%d.%m.%Y")

        return letzte_pruefung, naechste_pruefung

    def _berechne_pruefungsstatus_fuer_typ(self, protokoll: AtemschutzGeraetProtokoll | None, typ: str):
        if not protokoll or not protokoll.datum:
            return "", ""

        letzte_pruefung = protokoll.datum.strftime("%d.%m.%Y")

        if typ == "monatlich":
            naechste_pruefung = self._add_months(protokoll.datum, 1).strftime("%d.%m.%Y")
        elif typ == "jaehrlich":
            naechste_pruefung = self._add_years(protokoll.datum, 1).strftime("%d.%m.%Y")
        elif typ == "zehnjahre":
            naechste_pruefung = self._add_years(protokoll.datum, 10).strftime("%d.%m.%Y")
        else:
            naechste_pruefung = ""

        return letzte_pruefung, naechste_pruefung

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)

        geraete = list(resp.data)
        geraet_pkids = [item.get("pkid") for item in geraete if item.get("pkid") is not None]
        latest_by_geraet = {}
        latest_by_geraet_typ = {}

        if geraet_pkids:
            protokolle = (
                AtemschutzGeraetProtokoll.objects.filter(geraet_id_id__in=geraet_pkids)
                .order_by("geraet_id_id", "-datum", "-created_at")
            )
            for eintrag in protokolle:
                if self._is_pruefungseintrag(eintrag) and eintrag.geraet_id_id not in latest_by_geraet:
                    latest_by_geraet[eintrag.geraet_id_id] = eintrag

                typ_status = latest_by_geraet_typ.setdefault(
                    eintrag.geraet_id_id,
                    {"monatlich": None, "jaehrlich": None, "zehnjahre": None},
                )

                if eintrag.preufung_monatlich and typ_status["monatlich"] is None:
                    typ_status["monatlich"] = eintrag
                if eintrag.pruefung_jaehrlich and typ_status["jaehrlich"] is None:
                    typ_status["jaehrlich"] = eintrag
                if eintrag.pruefung_10jahre and typ_status["zehnjahre"] is None:
                    typ_status["zehnjahre"] = eintrag

        for item in geraete:
            letzte_pruefung = ""
            naechste_pruefung = ""
            protokoll = latest_by_geraet.get(item.get("pkid"))
            typ_status = latest_by_geraet_typ.get(item.get("pkid"), {})

            if protokoll:
                letzte_pruefung, naechste_pruefung = self._berechne_pruefungsstatus(protokoll)

            letzte_monatlich, naechste_monatlich = self._berechne_pruefungsstatus_fuer_typ(
                typ_status.get("monatlich"),
                "monatlich",
            )
            letzte_jaehrlich, naechste_jaehrlich = self._berechne_pruefungsstatus_fuer_typ(
                typ_status.get("jaehrlich"),
                "jaehrlich",
            )
            letzte_zehnjahre, naechste_zehnjahre = self._berechne_pruefungsstatus_fuer_typ(
                typ_status.get("zehnjahre"),
                "zehnjahre",
            )

            item["letzte_pruefung"] = letzte_pruefung
            item["naechste_pruefung"] = naechste_pruefung
            item["letzte_pruefung_monatlich"] = letzte_monatlich
            item["naechste_pruefung_monatlich"] = naechste_monatlich
            item["letzte_pruefung_jaehrlich"] = letzte_jaehrlich
            item["naechste_pruefung_jaehrlich"] = naechste_jaehrlich
            item["letzte_pruefung_10jahre"] = letzte_zehnjahre
            item["naechste_pruefung_10jahre"] = naechste_zehnjahre

        fmd = FMDSerializer(FMD.objects.all(), many=True).data
        mitglieder = MitgliedSerializer(
            Mitglied.objects.exclude(dienststatus=Mitglied.Dienststatus.RESERVE),
            many=True,
        ).data
        return Response({"main": geraete, "fmd": fmd, "mitglieder": mitglieder})

class AtemschutzGeraeteProtokollViewSet(ModelViewSet):
    queryset = AtemschutzGeraetProtokoll.objects.all().order_by("datum")
    serializer_class = AtemschutzGeraetProtokollSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "ATEMSCHUTZ", "PROTOKOLL")]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['geraet_id']
    ordering_fields = ["datum"]
    ordering = ["datum"]

    def _is_protocol_editor(self, request):
        return hasattr(request.user, "has_any_role") and request.user.has_any_role("ADMIN", "PROTOKOLL")

    def _assert_protocol_editor(self, request):
        if not self._is_protocol_editor(request):
            raise PermissionDenied("Nur ADMIN oder PROTOKOLL dürfen Protokolle ändern.")

    def _sync_naechste_gue_from_pruefung(self, protokoll):
        if not protokoll.pruefung_10jahre or not protokoll.datum:
            return

        naechste_gue_jahr = str(protokoll.datum.year + 10)
        geraet = protokoll.geraet_id

        if geraet and geraet.naechste_gue != naechste_gue_jahr:
            geraet.naechste_gue = naechste_gue_jahr
            geraet.save(update_fields=["naechste_gue"])

    def perform_create(self, serializer):
        protokoll = serializer.save()
        self._sync_naechste_gue_from_pruefung(protokoll)

    def perform_update(self, serializer):
        protokoll = serializer.save()
        self._sync_naechste_gue_from_pruefung(protokoll)

    def create(self, request, *args, **kwargs):
        self._assert_protocol_editor(request)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        is_partial = bool(kwargs.get("partial", False))
        if is_partial:
            if not self._is_protocol_editor(request):
                allowed_patch_fields = {"notiz"}
                incoming_fields = set(request.data.keys())
                if not incoming_fields or not incoming_fields.issubset(allowed_patch_fields):
                    raise PermissionDenied("Nur Notiz darf ohne ADMIN/PROTOKOLL geändert werden.")
        else:
            self._assert_protocol_editor(request)

        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        self._assert_protocol_editor(request)
        return super().destroy(request, *args, **kwargs)

class AtemschutzGeraeteDienstbuchViewSet(ModelViewSet):
    queryset = AtemschutzGeraetProtokoll.objects.all().order_by("datum")
    serializer_class = AtemschutzGeraetProtokollSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "ATEMSCHUTZ", "PROTOKOLL")]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 
    filter_backends = [filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['geraet_id']
    ordering_fields = ["datum"]
    ordering = ["datum"]

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        mitglieder = MitgliedSerializer(
            Mitglied.objects.exclude(dienststatus=Mitglied.Dienststatus.RESERVE),
            many=True,
        ).data
        return Response({"protokoll": resp.data, "mitglieder": mitglieder})
