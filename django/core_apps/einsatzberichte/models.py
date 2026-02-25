import os
import re

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel
from core_apps.fahrzeuge.models import Fahrzeug
from core_apps.mitglieder.models import Mitglied


def einsatzbericht_foto_path(instance, filename):
    cleaned = os.path.basename(filename or "upload.jpg")
    cleaned = re.sub(r"[^\w.\-]+", "_", cleaned)
    report_id = instance.einsatzbericht.id if instance.einsatzbericht_id else "neu"
    return os.path.join("einsatzberichte", str(report_id), cleaned)


class Einsatzbericht(TimeStampedModel):
    class Status(models.TextChoices):
        ENTWURF = "ENTWURF", "Entwurf"
        ABGESCHLOSSEN = "ABGESCHLOSSEN", "Abgeschlossen"

    einsatzleiter = models.CharField(_("Einsatzleiter"), max_length=255)
    einsatzart = models.CharField(_("Einsatzart"), max_length=120)
    alarmstichwort = models.CharField(_("Alarmstichwort"), max_length=255)
    einsatzadresse = models.CharField(_("Einsatzadresse"), max_length=500)
    alarmierende_stelle = models.CharField(_("Alarmierende Stelle"), max_length=255)

    einsatz_datum = models.DateField(_("Einsatzdatum"), null=True, blank=True)
    ausgerueckt = models.TimeField(_("Ausgerückt"), null=True, blank=True)
    eingerueckt = models.TimeField(_("Eingerückt"), null=True, blank=True)

    lage_beim_eintreffen = models.TextField(_("Lage beim Eintreffen"), blank=True, default="")
    gesetzte_massnahmen = models.TextField(_("Gesetzte Maßnahmen"), blank=True, default="")

    brand_kategorie = models.CharField(_("Brand Kategorie"), max_length=120, blank=True, default="")
    technisch_kategorie = models.CharField(_("Technisch Kategorie"), max_length=120, blank=True, default="")

    geschaedigter_pkw = models.BooleanField(_("Geschädigter PKW"), default=False)
    foto_doku = models.BooleanField(_("Foto Doku"), default=False)
    zulassungsschein = models.BooleanField(_("Zulassungsschein"), default=False)
    versicherungsschein = models.BooleanField(_("Versicherungsschein"), default=False)

    status = models.CharField(_("Status"), choices=Status.choices, default=Status.ENTWURF, max_length=20)

    blaulichtsms_einsatz_id = models.CharField(_("BlaulichtSMS Einsatz-ID"), max_length=120, blank=True, default="")
    blaulichtsms_payload = models.JSONField(_("BlaulichtSMS Daten"), default=dict, blank=True)

    fahrzeuge = models.ManyToManyField(Fahrzeug, related_name="einsatzberichte", blank=True)
    mitglieder = models.ManyToManyField(Mitglied, related_name="einsatzberichte", blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="einsatzberichte",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at", "-pkid"]

    def __str__(self):
        return f"{self.alarmstichwort} ({self.status})"


class EinsatzberichtFoto(TimeStampedModel):
    class DokumentTyp(models.TextChoices):
        ALLGEMEIN = "ALLGEMEIN", "Allgemein"
        DOKU = "DOKU", "Foto Doku"
        ZULASSUNG = "ZULASSUNG", "Zulassungsschein"
        VERSICHERUNG = "VERSICHERUNG", "Versicherungsschein"

    einsatzbericht = models.ForeignKey(Einsatzbericht, on_delete=models.CASCADE, related_name="fotos")
    foto = models.ImageField(_("Foto"), upload_to=einsatzbericht_foto_path)
    dokument_typ = models.CharField(
        _("Dokumenttyp"),
        max_length=20,
        choices=DokumentTyp.choices,
        default=DokumentTyp.ALLGEMEIN,
    )

    class Meta:
        ordering = ["pkid"]

    def __str__(self):
        return f"Foto zu {self.einsatzbericht_id}"