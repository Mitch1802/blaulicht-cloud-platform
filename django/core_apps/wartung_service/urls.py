from django.urls import path

from .views import WartungServiceOverviewView


urlpatterns = [
    path("", WartungServiceOverviewView.as_view(), name="wartung-service-overview"),
]
