from django.urls import path
from .views import (
    MediaNewsGetFileView,
    MediaInventarGetFileView,
    MediaEinsatzberichteGetFileView,
    MediaCleanupOrphansView,
)


urlpatterns = [
    path("news/<path:filename>", MediaNewsGetFileView.as_view(), name="news-file-get"),
    path("inventar/<path:filename>", MediaInventarGetFileView.as_view(), name="inventar-file-get"),
    path("einsatzberichte/<path:filename>", MediaEinsatzberichteGetFileView.as_view(), name="einsatzberichte-file-get"),
    path("cleanup-orphans/", MediaCleanupOrphansView.as_view(), name="media-cleanup-orphans"),
]
