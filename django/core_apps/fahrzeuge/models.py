import mimetypes
import os
import re

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.crypto import get_random_string
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel


ALLOWED_EXTS = {"jpg", "jpeg", "png"}


def _clean_filename(name: str) -> str:
    name = (name or "").strip()
    name = os.path.basename(name)
    name = re.sub(r"[^\w.\-]+", "_", name)
    return name or "upload"


def _ext_from_name(name: str) -> str | None:
    if "." in name:
        ext = name.rsplit(".", 1)[-1].lower().strip()
        return ext or None
    return None


def _coerce_ext(name: str, fallback="png") -> str:
    ext = _ext_from_name(name)
    if ext in ALLOWED_EXTS:
        return ext

    guess_type, _ = mimetypes.guess_type(name)
    if guess_type:
        guessed = (guess_type.split("/")[-1] or "").lower()
        if guessed in ALLOWED_EXTS:
            return guessed

    return fallback


def _build_upload_path(prefix: str, instance, filename: str) -> str:
    filename = _clean_filename(filename)
    ext = _coerce_ext(filename)

    if ext not in ALLOWED_EXTS:
        raise ValidationError(f"invalid file extension: {filename!r}")

    if getattr(instance, "id", None):
        filename = f"{instance.id}.{ext}"
    else:
        base, _ = os.path.splitext(filename)
        filename = f"{base}.{ext}"

    return os.path.join(prefix, filename)


def fahrzeug_foto_filename(instance, filename):
    return _build_upload_path("fahrzeuge", instance, filename)


def fahrzeug_raum_foto_filename(instance, filename):
    return _build_upload_path("fahrzeuge/raeume", instance, filename)


class Fahrzeug(TimeStampedModel):
    name = models.CharField(verbose_name=_("Name"), max_length=120)
    bezeichnung = models.CharField(verbose_name=_("Bezeichnung"), max_length=50, blank=True, default="")
    beschreibung = models.TextField(verbose_name=_("Beschreibung"), blank=True, default="")
    service_zuletzt_am = models.DateField(verbose_name=_("Service zuletzt am"), blank=True, null=True)
    service_naechstes_am = models.DateField(verbose_name=_("Service naechstes am"), blank=True, null=True)
    foto = models.ImageField(_("Foto"), upload_to=fahrzeug_foto_filename, blank=True, null=True)

    # Public Zugriff (QR / URL)
    public_id = models.CharField(verbose_name=_("Public Id"), max_length=32, unique=True, editable=False)

    def save(self, *args, **kwargs):
        if not self.public_id:
            self.public_id = get_random_string(24)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["name", "pkid"]


class FahrzeugRaum(TimeStampedModel):
    fahrzeug = models.ForeignKey(Fahrzeug, on_delete=models.CASCADE, related_name="raeume")
    name = models.CharField(verbose_name=_("Name"), max_length=120)
    reihenfolge = models.PositiveIntegerField(verbose_name=_("Reihenfolge"), default=0)
    foto = models.ImageField(_("Foto"), upload_to=fahrzeug_raum_foto_filename, blank=True, null=True)

    class Meta:
        ordering = ["reihenfolge", "pkid"]


class RaumItem(TimeStampedModel):
    raum = models.ForeignKey(FahrzeugRaum, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(verbose_name=_("Name"), max_length=180)
    menge = models.DecimalField(verbose_name=_("Menge"), max_digits=10, decimal_places=2, default=1)
    einheit = models.CharField(verbose_name=_("Einheit"), max_length=30, blank=True, default="")
    notiz = models.CharField(verbose_name=_("Notiz"), max_length=255, blank=True, default="")
    reihenfolge = models.PositiveIntegerField(verbose_name=_("Reihenfolge"), default=0)
    wartung_zuletzt_am = models.DateField(verbose_name=_("Wartung zuletzt am"), blank=True, null=True)
    wartung_naechstes_am = models.DateField(verbose_name=_("Wartung naechstes am"), blank=True, null=True)

    class Meta:
        ordering = ["reihenfolge", "pkid"]


class FahrzeugCheck(TimeStampedModel):
    fahrzeug = models.ForeignKey(Fahrzeug, on_delete=models.CASCADE, related_name="checks")
    title = models.CharField(verbose_name=_("Titel"), max_length=120, blank=True, default="")
    notiz = models.TextField(verbose_name=_("Notiz"), blank=True, default="")

    class Meta:
        ordering = ["-created_at", "-pkid"]


class FahrzeugCheckItem(TimeStampedModel):
    class Status(models.TextChoices):
        OK = "ok", "OK"
        MISSING = "missing", "Fehlt"
        DAMAGED = "damaged", "Beschädigt"

    fahrzeug_check = models.ForeignKey(FahrzeugCheck, on_delete=models.CASCADE, related_name="results")
    item = models.ForeignKey(RaumItem, verbose_name=_("Item"), on_delete=models.PROTECT)
    status = models.CharField(verbose_name=_("Status"), max_length=20, choices=Status.choices, default=Status.OK)
    menge_aktuel = models.DecimalField(verbose_name=_("Menge Aktuell"), max_digits=10, decimal_places=2, null=True, blank=True)
    notiz = models.CharField(verbose_name=_("Notiz"), max_length=255, blank=True, default="")

    class Meta:
        ordering = ["pkid"]
