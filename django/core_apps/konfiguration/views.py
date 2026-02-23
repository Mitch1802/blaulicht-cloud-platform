import os
from rest_framework import permissions
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Konfiguration
from .serializers import KonfigurationSerializer
from core_apps.common.permissions import HasAnyRolePermission, HasReadOnlyRolePermission, any_of
from core_apps.backup.views import backup_path
from core_apps.users.models import Role
from core_apps.users.serializers import RoleSerializer
    

class KonfigurationViewSet(ModelViewSet):
    queryset = Konfiguration.objects.all()
    serializer_class = KonfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, any_of(HasAnyRolePermission.with_roles("ADMIN"), HasReadOnlyRolePermission.with_roles("MITGLIED"))]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 
    
    def _has_role(self, user, role_name: str) -> bool:
        return user.is_authenticated and user.roles.filter(key=role_name).exists()

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)

        if request.user.has_role("ADMIN"):
            backups = os.listdir(backup_path)
            rollen = RoleSerializer(Role.objects.all(), many=True).data
            return Response({"main": resp.data, "backups": backups, "rollen": rollen})

        return Response(resp.data)
