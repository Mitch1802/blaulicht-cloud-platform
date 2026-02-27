from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class AnwesenheitslisteConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core_apps.anwesenheitsliste"
    verbose_name = _("Anwesenheitsliste")
