from django.db import models
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel


class Anwesenheitsliste(TimeStampedModel):
    titel = models.CharField(verbose_name=_("Titel"), max_length=255)
    datum = models.DateField(verbose_name=_("Datum"), blank=True, null=True)
    ort = models.CharField(verbose_name=_("Ort"), max_length=255, blank=True)
    notiz = models.TextField(verbose_name=_("Notiz"), blank=True)

    class Meta:
        ordering = ["-datum", "titel"]

    def __str__(self):
        return self.titel
