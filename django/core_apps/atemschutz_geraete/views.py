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

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        fmd = FMDSerializer(FMD.objects.all(), many=True).data
        mitglieder = MitgliedSerializer(
            Mitglied.objects.exclude(dienststatus=Mitglied.Dienststatus.RESERVE),
            many=True,
        ).data
        return Response({"main": resp.data, "fmd": fmd, "mitglieder": mitglieder})

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
