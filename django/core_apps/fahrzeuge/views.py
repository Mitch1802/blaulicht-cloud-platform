from django.conf import settings
from django.core import signing
from django.shortcuts import get_object_or_404

from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from core_apps.common.permissions import HasAnyRolePermission

from .models import Fahrzeug, FahrzeugRaum, RaumItem, FahrzeugCheck, FahrzeugCheckItem
from .serializers import (
    FahrzeugListSerializer,
    FahrzeugDetailSerializer,
    FahrzeugCrudSerializer,
    FahrzeugRaumSerializer,
    FahrzeugRaumCrudSerializer,
    RaumItemSerializer,
    RaumItemCrudSerializer,
    FahrzeugPublicDetailSerializer,
    FahrzeugCheckCreateSerializer,
)


# ==========================================================
# Public Token (globaler PIN -> Token ist NICHT an Fahrzeug gebunden)
# ==========================================================
def make_public_token() -> str:
    payload = {"scope": "public_readonly"}
    return signing.dumps(payload, salt="fahrzeug_public_pin_v2")


def read_public_token(token: str) -> dict | None:
    try:
        ttl_min = getattr(settings, "PUBLIC_TOKEN_TTL_MIN", 60)
        return signing.loads(
            token,
            salt="fahrzeug_public_pin_v2",
            max_age=ttl_min * 60,
        )
    except (signing.BadSignature, signing.SignatureExpired, TypeError, ValueError):
        return None


class PublicPinVerifyView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_pin_verify"

    def post(self, request):
        pin = str(request.data.get("pin", "")).strip()
        if not pin:
            return Response({"detail": "PIN fehlt."}, status=status.HTTP_400_BAD_REQUEST)

        if not getattr(settings, "PUBLIC_PIN_ENABLED", False):
            return Response({"detail": "PIN ist deaktiviert."}, status=status.HTTP_403_FORBIDDEN)

        if pin != getattr(settings, "PUBLIC_FAHRZEUG_PIN", ""):
            return Response({"detail": "PIN falsch."}, status=status.HTTP_403_FORBIDDEN)

        ttl_min = getattr(settings, "PUBLIC_TOKEN_TTL_MIN", 60)
        return Response({"access_token": make_public_token(), "expires_in": ttl_min * 60})


class PublicFahrzeugDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, public_id: str):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return Response({"detail": "Token fehlt."}, status=status.HTTP_401_UNAUTHORIZED)

        token = auth.removeprefix("Bearer ").strip()
        payload = read_public_token(token)
        if not payload or payload.get("scope") != "public_readonly":
            return Response({"detail": "Token ungültig/abgelaufen."}, status=status.HTTP_401_UNAUTHORIZED)

        fahrzeug = get_object_or_404(
            Fahrzeug.objects.prefetch_related("raeume__items"),
            public_id=public_id,
        )
        return Response(FahrzeugPublicDetailSerializer(fahrzeug).data)


# ==========================================================
# Auth CRUD: Fahrzeuge
# ==========================================================
class FahrzeugViewSet(viewsets.ModelViewSet):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "FAHRZEUG"),
    ]
    queryset = Fahrzeug.objects.prefetch_related("raeume__items").order_by("name")
    lookup_field = "id"  # UUID aus TimeStampedModel

    def get_serializer_class(self):
        if self.action == "list":
            return FahrzeugListSerializer
        if self.action == "retrieve":
            return FahrzeugDetailSerializer
        return FahrzeugCrudSerializer


# ==========================================================
# Nested: Räume
# ==========================================================
class FahrzeugRaumViewSet(viewsets.ModelViewSet):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "FAHRZEUG"),
    ]
    lookup_field = "id"

    def get_queryset(self):
        return FahrzeugRaum.objects.filter(fahrzeug__id=self.kwargs["fahrzeug_id"]).order_by("reihenfolge", "pkid")

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return FahrzeugRaumSerializer
        return FahrzeugRaumCrudSerializer

    def perform_create(self, serializer):
        fahrzeug = get_object_or_404(Fahrzeug, id=self.kwargs["fahrzeug_id"])
        serializer.save(fahrzeug=fahrzeug)


# ==========================================================
# Nested: Items
# ==========================================================
class RaumItemViewSet(viewsets.ModelViewSet):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "FAHRZEUG"),
    ]
    lookup_field = "id"

    def get_queryset(self):
        return RaumItem.objects.filter(raum__id=self.kwargs["raum_id"]).order_by("reihenfolge", "pkid")

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return RaumItemSerializer
        return RaumItemCrudSerializer

    def perform_create(self, serializer):
        raum = get_object_or_404(FahrzeugRaum, id=self.kwargs["raum_id"])
        serializer.save(raum=raum)


# ==========================================================
# Check speichern (Auth)
# ==========================================================
class FahrzeugCheckCreateView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "FAHRZEUG"),
    ]

    def post(self, request, fahrzeug_id):
        ser = FahrzeugCheckCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        fahrzeug = get_object_or_404(Fahrzeug, id=fahrzeug_id)

        check = FahrzeugCheck.objects.create(
            fahrzeug=fahrzeug,
            title=ser.validated_data.get("title", ""),
            notiz=ser.validated_data.get("notiz", ""),
        )

        item_ids = [r["item_id"] for r in ser.validated_data["results"]]

        # Items müssen zu diesem Fahrzeug gehören -> Filter über raum__fahrzeug_id
        items = RaumItem.objects.select_related("raum").filter(
            pkid__in=item_ids,
            raum__fahrzeug_id=fahrzeug.pkid,
        )
        item_map = {i.pkid: i for i in items}

        bulk = []
        for r in ser.validated_data["results"]:
            item = item_map.get(r["item_id"])
            if not item:
                return Response(
                    {"detail": f"Item {r['item_id']} gehört nicht zu diesem Fahrzeug."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            bulk.append(
                FahrzeugCheckItem(
                    fahrzeug_check=check,
                    item=item,
                    status=r["status"],
                    menge_aktuel=r.get("menge_aktuel"),
                    notiz=r.get("notiz", ""),
                )
            )

        FahrzeugCheckItem.objects.bulk_create(bulk)
        return Response({"id": str(check.id)}, status=status.HTTP_201_CREATED)
