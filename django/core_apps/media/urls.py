from django.urls import path
from .views import (
    MediaNewsGetFileView,
    MediaInventarGetFileView,
    MediaEinsatzberichteGetFileView,
    MediaAnwesenheitslisteGetFileView,
    MediaCleanupOrphansView,
)


urlpatterns = [
    path("news/<path:filename>", MediaNewsGetFileView.as_view(), name="news-file-get"),
    path("inventar/<path:filename>", MediaInventarGetFileView.as_view(), name="inventar-file-get"),
    path("einsatzberichte/<path:filename>", MediaEinsatzberichteGetFileView.as_view(), name="einsatzberichte-file-get"),
    path("anwesenheitsliste/<path:filename>", MediaAnwesenheitslisteGetFileView.as_view(), name="anwesenheitsliste-file-get"),
    path("cleanup-orphans/", MediaCleanupOrphansView.as_view(), name="media-cleanup-orphans"),
]
