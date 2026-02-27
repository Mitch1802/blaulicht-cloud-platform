from rest_framework import permissions
from rest_framework.parsers import JSONParser
from rest_framework.viewsets import ModelViewSet

from core_apps.common.permissions import HasAnyRolePermission

from .models import Anwesenheitsliste
from .serializers import AnwesenheitslisteSerializer


class AnwesenheitslisteViewSet(ModelViewSet):
    queryset = Anwesenheitsliste.objects.all()
    serializer_class = AnwesenheitslisteSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "VERWALTUNG", "MITGLIED"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
