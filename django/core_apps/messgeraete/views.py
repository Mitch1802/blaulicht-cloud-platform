from rest_framework import permissions, filters
from rest_framework.parsers import JSONParser
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