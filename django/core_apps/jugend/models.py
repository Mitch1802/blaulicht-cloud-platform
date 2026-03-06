from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel
from core_apps.mitglieder.models import Mitglied


class JugendAusbildung(TimeStampedModel):
    mitglied = models.OneToOneField(
        Mitglied,
        on_delete=models.CASCADE,
        related_name="jugend_ausbildung",
        verbose_name=_("Mitglied"),
    )

    erprobung_lv1 = models.BooleanField(default=False)
    erprobung_lv1_datum = models.DateField(blank=True, null=True)
    erprobung_lv2 = models.BooleanField(default=False)
    erprobung_lv2_datum = models.DateField(blank=True, null=True)
    erprobung_lv3 = models.BooleanField(default=False)
    erprobung_lv3_datum = models.DateField(blank=True, null=True)
    erprobung_lv4 = models.BooleanField(default=False)
    erprobung_lv4_datum = models.DateField(blank=True, null=True)
    erprobung_lv5 = models.BooleanField(default=False)
    erprobung_lv5_datum = models.DateField(blank=True, null=True)

    wissentest_lv1 = models.BooleanField(default=False)
    wissentest_lv1_datum = models.DateField(blank=True, null=True)
    wissentest_lv2 = models.BooleanField(default=False)
    wissentest_lv2_datum = models.DateField(blank=True, null=True)
    wissentest_lv3 = models.BooleanField(default=False)
    wissentest_lv3_datum = models.DateField(blank=True, null=True)
    wissentest_lv4 = models.BooleanField(default=False)
    wissentest_lv4_datum = models.DateField(blank=True, null=True)
    wissentest_lv5 = models.BooleanField(default=False)
    wissentest_lv5_datum = models.DateField(blank=True, null=True)

    fwtechnik_spiel_datum = models.DateField(blank=True, null=True)
    fwtechnik_datum = models.DateField(blank=True, null=True)
    melder_spiel_datum = models.DateField(blank=True, null=True)
    melder_datum = models.DateField(blank=True, null=True)
    sicher_zu_wasser_spiel_datum = models.DateField(blank=True, null=True)
    sicher_zu_wasser_datum = models.DateField(blank=True, null=True)

    class Meta(TimeStampedModel.Meta):
        ordering = ["mitglied__stbnr"]

    def __str__(self):
        return f"JugendAusbildung {self.mitglied.stbnr}"


class JugendEvent(TimeStampedModel):
    class Kategorie(models.TextChoices):
        WISSENSTEST = "WISSENSTEST", _("Wissentest")
        ERPROBUNG = "ERPROBUNG", _("Erprobung")
        FWTECHNIK = "FWTECHNIK", _("FW-Technik")
        MELDER = "MELDER", _("Melder")
        SICHER_ZU_WASSER = "SICHER_ZU_WASSER", _("Sicher zu Wasser")
        SONSTIGES = "SONSTIGES", _("Sonstiges")

    titel = models.CharField(max_length=255, verbose_name=_("Titel"))
    datum = models.DateField(verbose_name=_("Datum"))
    ort = models.CharField(max_length=255, blank=True, verbose_name=_("Ort"))
    kategorie = models.CharField(
        max_length=32,
        choices=Kategorie.choices,
        default=Kategorie.SONSTIGES,
        verbose_name=_("Kategorie"),
    )
    mitglieder_teilgenommen = models.ManyToManyField(
        Mitglied,
        related_name="jugend_events_neu",
        blank=True,
    )

    class Meta(TimeStampedModel.Meta):
        ordering = ["-datum", "titel"]

    def __str__(self):
        return f"{self.titel} ({self.datum})"


class JugendEventTeilnahme(TimeStampedModel):
    event = models.ForeignKey(
        JugendEvent,
        on_delete=models.CASCADE,
        related_name="teilnahmen",
        verbose_name=_("Event"),
    )
    mitglied = models.ForeignKey(
        Mitglied,
        on_delete=models.CASCADE,
        related_name="jugend_event_teilnahmen",
        verbose_name=_("Mitglied"),
    )
    level = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name=_("Erreichtes Level"),
    )

    class Meta(TimeStampedModel.Meta):
        ordering = ["event__datum", "mitglied__stbnr"]
        unique_together = ("event", "mitglied")

    def __str__(self):
        if self.level is None:
            return f"{self.event.titel} - {self.mitglied.stbnr}"
        return f"{self.event.titel} - {self.mitglied.stbnr} (L{self.level})"
