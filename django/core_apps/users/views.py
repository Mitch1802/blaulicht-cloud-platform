from django.contrib.auth import get_user_model
from django.http import Http404
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from dj_rest_auth.views import LoginView, LogoutView
from dj_rest_auth.app_settings import api_settings as rest_auth_settings

from .models import User, Role
from .renderers import UserJSONRenderer
from .serializers import (
    AdminCreateUserSerializer,
    ChangePasswordSerializer,
    InviteSetPasswordSerializer,
    RoleSerializer,
    UserSelfSerializer,
    UserSerializer,
)
from .invite_tokens import resolve_invite_token
from core_apps.common.permissions import IsAdminPermission, HasAnyRolePermission


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class PublicLoginView(LoginView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class CustomUserDetailsView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSelfSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "MITGLIED", "JUGEND", "BERICHT"),
    ]

    def get_object(self):
        return self.request.user

    def get_queryset(self):
        return get_user_model().objects.none()


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]
    renderer_classes = [UserJSONRenderer]


class UserContextView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]
    renderer_classes = [UserJSONRenderer]

    def get(self, request):
        from core_apps.mitglieder.models import Mitglied
        from core_apps.mitglieder.serializers import MitgliedSerializer

        rollen = RoleSerializer(Role.objects.all(), many=True).data
        mitglieder = MitgliedSerializer(Mitglied.objects.all(), many=True).data
        return Response({"rollen": rollen, "mitglieder": mitglieder})


class UserRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]
    lookup_field = "id"
    renderer_classes = [UserJSONRenderer]

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Http404:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = self.get_serializer(instance)

        return Response({
            'user': serializer.data
        })

class ChangePasswordView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "MITGLIED")]
    lookup_field = "id"

    def get_object(self):
        target_user = super().get_object()
        if self.request.user.is_superuser or self.request.user.has_role("ADMIN"):
            return target_user
        if target_user.id != self.request.user.id:
            raise PermissionDenied("Du darfst nur dein eigenes Passwort ändern.")
        return target_user


class ForceLogoutView(LogoutView):
    def _cookie_cleanup_response(self):
        response = Response({"detail": "Cookies removed."}, status=200)
        response.delete_cookie('sessionid')

        if rest_auth_settings.JWT_AUTH_COOKIE:
            response.delete_cookie(
                rest_auth_settings.JWT_AUTH_COOKIE,
                samesite=rest_auth_settings.JWT_AUTH_SAMESITE,
                domain=rest_auth_settings.JWT_AUTH_COOKIE_DOMAIN,
            )

        if rest_auth_settings.JWT_AUTH_REFRESH_COOKIE:
            response.delete_cookie(
                rest_auth_settings.JWT_AUTH_REFRESH_COOKIE,
                path=rest_auth_settings.JWT_AUTH_REFRESH_COOKIE_PATH,
                samesite=rest_auth_settings.JWT_AUTH_SAMESITE,
                domain=rest_auth_settings.JWT_AUTH_COOKIE_DOMAIN,
            )

        return response

    def logout(self, request, *args, **kwargs):
        if User.objects.filter(pk=request.user.pk).exists():
            response = super().logout(request, *args, **kwargs)
            response_status = getattr(response, "status_code", response)

            if response_status == status.HTTP_200_OK:
                return response

            if response_status in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED):
                return self._cookie_cleanup_response()

            return response

        return self._cookie_cleanup_response()

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]

class AdminCreateUserView(generics.CreateAPIView):
    serializer_class = AdminCreateUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        user_data = UserSerializer(user).data
        invite_sent = bool(getattr(user, "invite_sent", False))

        return Response(
            {
                "user": user_data,
                "invite_sent": invite_sent,
            },
            status=status.HTTP_201_CREATED,
        )


class InviteSetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = InviteSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        user = resolve_invite_token(token)
        if user is None:
            return Response(
                {"detail": "Einladungslink ist ungültig oder abgelaufen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["password1"])
        user.save(update_fields=["password"])

        return Response({"detail": "Passwort erfolgreich gesetzt."}, status=status.HTTP_200_OK)

