from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    UserListView,
    UserContextView,
    UserRetrieveUpdateDestroyView,
    ChangePasswordView,
    RoleViewSet,
    CustomUserDetailsView,
    AdminCreateUserView
)

router = DefaultRouter()
router.register("rolle", RoleViewSet, basename="role")

urlpatterns = [
    path("", UserListView.as_view(), name="user-list"),
    path("context/", UserContextView.as_view(), name="user-context"),
    path("self/", CustomUserDetailsView.as_view(), name="user-self"),
    path("<uuid:id>/", UserRetrieveUpdateDestroyView.as_view(), name="user-retrieve-update-destroy"),
    path("create/", AdminCreateUserView.as_view(), name="user-create"),
    path("change_password/<uuid:id>/", ChangePasswordView.as_view(), name="user-change-password"),
    path("", include(router.urls)),
]
