from django.contrib.auth import get_user_model
from django.http import Http404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from dj_rest_auth.views import LogoutView

from .models import User, Role
from .renderers import UserJSONRenderer
from .serializers import UserSelfSerializer, UserSerializer, ChangePasswordSerializer, RoleSerializer, AdminCreateUserSerializer
from core_apps.common.permissions import IsAdminPermission, HasAnyRolePermission


class CustomUserDetailsView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSelfSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "MITGLIED")]

    def get_object(self):
        return self.request.user

    def get_queryset(self):
        return get_user_model().objects.none()


class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]
    renderer_classes = [UserJSONRenderer]

    def list(self, request):
        mod_queryset = self.filter_queryset(self.get_queryset())
        mod_serializer = self.get_serializer(mod_queryset, many=True)
        rollen = RoleSerializer(Role.objects.all(), many=True).data

        return Response({
            'main': mod_serializer.data,
            'rollen': rollen
        })


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


class ForceLogoutView(LogoutView):
    def logout(self, request, *args, **kwargs):
        if User.objects.filter(pk=request.user.pk).exists():
            return super().logout(request, *args, **kwargs)

        response = Response({"detail": "Cookies removed."}, status=200)
        response.delete_cookie('sessionid')
        response.delete_cookie('blaulichtcloud-access-token')
        return response

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]

class AdminCreateUserView(generics.CreateAPIView):
    serializer_class = AdminCreateUserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminPermission]