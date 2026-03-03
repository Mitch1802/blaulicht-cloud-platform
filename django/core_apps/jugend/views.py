from rest_framework import filters, permissions
from rest_framework.parsers import JSONParser
from rest_framework.viewsets import ModelViewSet

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.mitglieder.models import Mitglied

from .models import JugendAusbildung, JugendEvent
from .serializers import JugendAusbildungSerializer, JugendEventSerializer


class JugendAusbildungViewSet(ModelViewSet):
    queryset = JugendAusbildung.objects.select_related("mitglied").all().order_by("mitglied__stbnr")
    serializer_class = JugendAusbildungSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "MITGLIED"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["mitglied__stbnr", "created_at", "updated_at"]
    ordering = ["mitglied__stbnr"]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(mitglied__dienststatus=Mitglied.Dienststatus.JUGEND)
        )


class JugendEventViewSet(ModelViewSet):
    queryset = JugendEvent.objects.prefetch_related("mitglieder_teilgenommen").all().order_by("-datum", "titel")
    serializer_class = JugendEventSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "MITGLIED"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["datum", "titel", "created_at"]
    ordering = ["-datum", "titel"]
