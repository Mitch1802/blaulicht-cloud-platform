import os
import re

from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel
from core_apps.mitglieder.models import Mitglied


def homepage_photo_path(instance, filename):
    cleaned = os.path.basename(filename or "upload.jpg")
    cleaned = re.sub(r"[^\w.\-]+", "_", cleaned)
    item_id = str(getattr(instance, "id", "") or "neu")
    return os.path.join("homepage", item_id, cleaned)


class HomepageDienstposten(TimeStampedModel):
    section_id = models.SlugField(verbose_name=_("Sektions-ID"), max_length=80)
    section_title = models.CharField(verbose_name=_("Sektions-Titel"), max_length=120)
    section_order = models.PositiveSmallIntegerField(verbose_name=_("Sektions-Reihenfolge"), default=0)
    position = models.CharField(verbose_name=_("Position"), max_length=160)
    position_order = models.PositiveSmallIntegerField(verbose_name=_("Positions-Reihenfolge"), default=0)
    mitglied = models.ForeignKey(
        Mitglied,
        on_delete=models.SET_NULL,
        related_name="homepage_dienstposten",
        blank=True,
        null=True,
    )
    fallback_name = models.CharField(verbose_name=_("Fallback Name"), max_length=255, default="Nicht definiert")
    fallback_dienstgrad = models.CharField(verbose_name=_("Fallback Dienstgrad"), max_length=50, blank=True)
    fallback_photo = models.CharField(verbose_name=_("Fallback Foto"), max_length=32, default="X")
    fallback_dienstgrad_img = models.CharField(verbose_name=_("Fallback Dienstgrad Bild"), max_length=120, blank=True)
    photo = models.ImageField(_("Foto Datei"), upload_to=homepage_photo_path, blank=True, null=True)

    class Meta(TimeStampedModel.Meta):
        ordering = ["section_order", "position_order", "position", "pkid"]
        verbose_name = _("Dienstposten")
        verbose_name_plural = _("Dienstposten")

    def save(self, *args, **kwargs):
        self.section_id = slugify(self.section_id or self.section_title or "sektion")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.section_title}: {self.position}"
