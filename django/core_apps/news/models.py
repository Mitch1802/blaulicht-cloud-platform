import os, re, mimetypes
from django.db import models
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from core_apps.common.models import TimeStampedModel


ALLOWED_EXTS = {"jpg", "jpeg", "png"}

def _clean_filename(name: str) -> str:
    name = (name or "").strip()
    name = os.path.basename(name)              # nur Basisname
    name = re.sub(r"[^\w.\-]+", "_", name)     # nur "sichere" Zeichen
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
    if guess_type:  # z.B. "image/png"
        mt_ext = (guess_type.split("/")[-1] or "").lower()
        if mt_ext == "svg+xml":  # kein SVG zulassen
            mt_ext = None
        if mt_ext in ALLOWED_EXTS:
            return mt_ext
    return fallback

def news_filename(instance, filename):
    filename = _clean_filename(filename)
    ext = _coerce_ext(filename)

    if ext not in ALLOWED_EXTS:
        raise ValidationError(f"invalid file extension: {filename!r}")

    if getattr(instance, "id", None):
        filename = f"{instance.id}.{ext}"
    else:
        base, _ = os.path.splitext(filename)
        filename = f"{base}.{ext}"

    return os.path.join("news", filename)

class News(TimeStampedModel):  
    title = models.CharField(verbose_name=_("Titel"), max_length=255)
    text = models.TextField(verbose_name=_("Text"))
    typ = models.CharField(verbose_name=_("Typ"), max_length=255, default="intern")
    foto = models.ImageField(_("Foto"), upload_to=news_filename, blank=True, null=True)

    def __str__(self):
        return f"{self.title}"


class NewsTemplate(TimeStampedModel):
    name = models.CharField(verbose_name=_("Vorlagenname"), max_length=120, unique=True)
    title = models.CharField(verbose_name=_("Titel"), max_length=255)
    text = models.TextField(verbose_name=_("Text"))
    typ = models.CharField(verbose_name=_("Typ"), max_length=255, default="intern")
    active = models.BooleanField(verbose_name=_("Aktiv"), default=True)

    class Meta:
        verbose_name = _("News-Vorlage")
        verbose_name_plural = _("News-Vorlagen")
        ordering = ["name", "created_at"]

    def __str__(self):
        return f"{self.name}"
