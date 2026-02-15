from django.urls import path
from .views import ForceLogoutView
from dj_rest_auth.views import LoginView

urlpatterns = [
    path("login/", LoginView.as_view(), name="rest_login"),
    path("logout/", ForceLogoutView.as_view(), name="force_logout"),
]
