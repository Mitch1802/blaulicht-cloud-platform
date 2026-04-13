import os
from datetime import date

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Konfiguration
from .serializers import KonfigurationSerializer
from core_apps.common.permissions import HasAnyRolePermission, HasReadOnlyRolePermission, any_of
from core_apps.common.email import send_account_invite_email, send_service_reminder_email
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

    @action(detail=False, methods=["post"], url_path="test-emails")
    def test_emails(self, request, *args, **kwargs):
        if not request.user.has_role("ADMIN"):
            return Response({"detail": "Nur ADMIN darf Test-E-Mails versenden."}, status=status.HTTP_403_FORBIDDEN)

        email = str(request.data.get("email") or "").strip()
        if not email:
            return Response({"detail": "Bitte eine E-Mail-Adresse angeben."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Ungültige E-Mail-Adresse."}, status=status.HTTP_400_BAD_REQUEST)

        available_types = {
            "account_invite": "Einladungs-E-Mail",
            "service_reminder": "Service-Erinnerung",
        }
        email_type = str(request.data.get("email_type") or "").strip()
        if email_type not in available_types:
            return Response(
                {
                    "detail": "Ungültiger E-Mail-Typ.",
                    "available_types": [
                        {"key": key, "label": label}
                        for key, label in available_types.items()
                    ],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        config = Konfiguration.objects.first()
        fw_name = str(getattr(config, "fw_name", "") or "")

        sent = False
        if email_type == "account_invite":
            invite_url = "https://example.invalid/einladung?token=test"
            sent = send_account_invite_email(
                username="test-user",
                email=email,
                invite_url=invite_url,
                first_name="",
            )
        elif email_type == "service_reminder":
            reminder_items = [
                {
                    "modul": "WARTUNG",
                    "bereich": "TEST",
                    "eintrag": "Test-Eintrag Service",
                    "intervall": "alle 12 Monate",
                    "faelligkeit": date.today().isoformat(),
                    "status": "fällig",
                }
            ]
            sent = send_service_reminder_email(
                recipient_email=email,
                items=reminder_items,
                fw_name=fw_name,
                days=30,
            )

        return Response(
            {
                "email": email,
                "result": {
                    "key": email_type,
                    "label": available_types[email_type],
                    "sent": bool(sent),
                },
                "available_types": [
                    {"key": key, "label": label}
                    for key, label in available_types.items()
                ],
            }
        )
