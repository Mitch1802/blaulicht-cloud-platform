import os
import re

from django.db import models
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel
from core_apps.mitglieder.models import Mitglied


def anwesenheitsliste_foto_path(instance, filename):
    cleaned = os.path.basename(filename or "upload.jpg")
    cleaned = re.sub(r"[^\w.\-]+", "_", cleaned)
    liste_id = instance.anwesenheitsliste.id if instance.anwesenheitsliste_id else "neu"
    return os.path.join("anwesenheitsliste", str(liste_id), cleaned)


class Anwesenheitsliste(TimeStampedModel):
    mitglieder = models.ManyToManyField(Mitglied, blank=True, related_name="anwesenheitslisten")
    titel = models.CharField(verbose_name=_("Titel"), max_length=255)
    datum = models.DateField(verbose_name=_("Datum"), blank=True, null=True)
    ort = models.CharField(verbose_name=_("Ort"), max_length=255, blank=True)
    notiz = models.TextField(verbose_name=_("Notiz"), blank=True)

    class Meta:
        ordering = ["-datum", "titel"]

    def __str__(self):
        return self.titel


class AnwesenheitslisteFoto(TimeStampedModel):
    anwesenheitsliste = models.ForeignKey(Anwesenheitsliste, on_delete=models.CASCADE, related_name="fotos")
    foto = models.ImageField(_("Foto"), upload_to=anwesenheitsliste_foto_path)

    class Meta:
        ordering = ["pkid"]

    def __str__(self):
        return f"Foto zu {self.anwesenheitsliste_id}"
