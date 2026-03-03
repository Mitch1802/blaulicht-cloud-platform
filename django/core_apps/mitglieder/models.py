from django.db import models
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel


class Mitglied(TimeStampedModel):
    class Dienststatus(models.TextChoices):
        JUGEND = "JUGEND", _("Jugend")
        AKTIV = "AKTIV", _("Aktiv")
        RESERVE = "RESERVE", _("Reserve")
        ABGEMELDET = "ABGEMELDET", _("Abgemeldet")

    stbnr = models.IntegerField(verbose_name=_("Standesbuchnummer"), unique=True)
    vorname = models.CharField(verbose_name=_("Vorname"), max_length=255)
    nachname = models.CharField(verbose_name=_("Nachname"), max_length=255)
    dienstgrad = models.CharField(verbose_name=_("Dienstgrad"), max_length=50, blank=True)
    svnr = models.CharField(verbose_name=_("Sozialversichungsnummer"), max_length=4, blank=True)
    geburtsdatum = models.DateField(verbose_name=_("Geburtsdatum"), max_length=10)
    hauptberuflich = models.BooleanField(verbose_name=_("Hauptberuflich"), default=False)
    dienststatus = models.CharField(
        verbose_name=_("Dienststatus"),
        max_length=20,
        choices=Dienststatus.choices,
        default=Dienststatus.AKTIV,
    )

    def __str__(self):
        return f"{self.vorname} {self.nachname}"
    
    class Meta:
        ordering = ["stbnr"]


class JugendEvent(TimeStampedModel):
    titel = models.CharField(verbose_name=_("Titel"), max_length=255)
    datum = models.DateField(verbose_name=_("Datum"))
    notiz = models.TextField(verbose_name=_("Notiz"), blank=True)
    teilnehmer = models.ManyToManyField(
        Mitglied,
        through="JugendEventTeilnahme",
        related_name="jugend_events",
        blank=True,
    )

    class Meta:
        ordering = ["-datum", "titel"]

    def __str__(self):
        return f"{self.titel} ({self.datum})"


class JugendEventTeilnahme(TimeStampedModel):
    event = models.ForeignKey(JugendEvent, on_delete=models.CASCADE, related_name="teilnahmen")
    mitglied = models.ForeignKey(Mitglied, on_delete=models.CASCADE, related_name="jugend_teilnahmen")

    class Meta:
        unique_together = ("event", "mitglied")
        ordering = ["event", "mitglied"]
