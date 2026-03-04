from django.urls import path
from .views import ForceLogoutView
from dj_rest_auth.views import LoginView
from dj_rest_auth.jwt_auth import get_refresh_view

urlpatterns = [
    path("login/", LoginView.as_view(), name="rest_login"),
    path("logout/", ForceLogoutView.as_view(), name="force_logout"),
    path("token/refresh/", get_refresh_view().as_view(), name="token_refresh"),
]
