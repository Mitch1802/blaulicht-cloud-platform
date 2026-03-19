from django.urls import path
from .views import CsrfCookieView, ForceLogoutView, InviteSetPasswordView, PublicLoginView
from dj_rest_auth.jwt_auth import get_refresh_view

urlpatterns = [
    path("csrf/", CsrfCookieView.as_view(), name="csrf_cookie"),
    path("login/", PublicLoginView.as_view(), name="rest_login"),
    path("logout/", ForceLogoutView.as_view(), name="force_logout"),
    path("invite/complete/", InviteSetPasswordView.as_view(), name="invite_set_password"),
    path("token/refresh/", get_refresh_view().as_view(), name="token_refresh"),
]
