from django.urls import include, path
from django.conf import settings


API_PATH = settings.API_URL_PATH

urlpatterns = [
    path(f"{API_PATH}users/", include("core_apps.users.urls")),
    path(f"{API_PATH}auth/", include("core_apps.users.auth_urls")),
    path(f"{API_PATH}fmd/", include("core_apps.fmd.urls")),
    path(f"{API_PATH}mitglieder/", include("core_apps.mitglieder.urls")),
    path(f"{API_PATH}modul_konfiguration/", include("core_apps.modul_konfiguration.urls")),
    path(f"{API_PATH}konfiguration/", include("core_apps.konfiguration.urls")),
    path(f"{API_PATH}backup/", include("core_apps.backup.urls")),
    path(f"{API_PATH}news/", include("core_apps.news.urls")),
    path(f"{API_PATH}homepage/", include("core_apps.homepage.urls")),
    path(f"{API_PATH}inventar/", include("core_apps.inventar.urls")),
    path(f"{API_PATH}files/", include("core_apps.media.urls")),
    path(f"{API_PATH}atemschutz/", include("core_apps.atemschutz_masken.urls")),
    path(f"{API_PATH}atemschutz/", include("core_apps.atemschutz_geraete.urls")),
    path(f"{API_PATH}atemschutz/", include("core_apps.messgeraete.urls")),
    path(f"{API_PATH}pdf/", include("core_apps.pdf.urls")),
    path(API_PATH, include("core_apps.fahrzeuge.urls")),
    path(f"{API_PATH}verwaltung/", include("core_apps.verwaltung.urls")),
    path(f"{API_PATH}einsatzberichte/", include("core_apps.einsatzberichte.urls")),
    path(f"{API_PATH}anwesenheitsliste/", include("core_apps.anwesenheitsliste.urls")),
    path(f"{API_PATH}jugend/", include("core_apps.jugend.urls")),
    path(f"{API_PATH}wartung_service/", include("core_apps.wartung_service.urls")),
]
