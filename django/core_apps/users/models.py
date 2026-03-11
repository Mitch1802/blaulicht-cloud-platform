import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import CustomUserManager


class Role(models.Model):
    """
    Rollendefinition für Benutzer (z.B. Administrator, FMD, Verwaltung, Atemschutz)
    """
    key = models.CharField(max_length=20, unique=True)
    verbose_name = models.CharField(max_length=50)

    def __str__(self):
        return self.verbose_name


class User(AbstractBaseUser, PermissionsMixin):
    pkid = models.BigAutoField(primary_key=True, editable=False)
    id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    first_name = models.CharField(verbose_name=_("first name"), max_length=50)
    last_name = models.CharField(verbose_name=_("last name"), max_length=50)
    username = models.CharField(
        verbose_name=_("username"), max_length=50, db_index=True, unique=True
    )
    email = models.EmailField(verbose_name=_("email address"), null=True, blank=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    # Mitgliederzugehörigkeit (optional)
    mitglied = models.OneToOneField(
        "mitglieder.Mitglied",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="benutzer",
        verbose_name=_("Mitglied"),
    )

    # Multiple roles pro User
    roles = models.ManyToManyField(
        Role,
        blank=True,
        related_name="users",
        verbose_name="Benutzerrollen"
    )

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = CustomUserManager()

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")

    def __str__(self):
        return self.username

    @property
    def get_full_name(self):
        return f"{self.first_name.title()} {self.last_name.title()}"

    @property
    def get_short_name(self):
        return self.first_name
    
    def has_role(self, key: str) -> bool:
        normalized = str(key or "").strip()
        if not normalized:
            return False
        return self.roles.filter(key__iexact=normalized).exists()

    def has_any_role(self, *keys: str) -> bool:
        normalized_keys = [str(k or "").strip() for k in keys if str(k or "").strip()]
        if not normalized_keys:
            return False

        query = Q()
        for role_key in normalized_keys:
            query |= Q(key__iexact=role_key)

        return self.roles.filter(query).exists()
