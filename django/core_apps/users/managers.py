from django.contrib.auth.base_user import BaseUserManager
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils.translation import gettext_lazy as _


class CustomUserManager(BaseUserManager):
    def _extract_password(self, args, password, extra_fields):
        remaining_args = list(args)

        # Kompatibilität für ältere Aufrufe mit first_name/last_name.
        extra_fields.pop("first_name", None)
        extra_fields.pop("last_name", None)

        if password is None and len(remaining_args) == 1:
            password = remaining_args.pop(0)
        elif len(remaining_args) >= 3:
            remaining_args = remaining_args[2:]
            if password is None and remaining_args:
                password = remaining_args.pop(0)

        if remaining_args:
            raise TypeError(_("Unerwartete Positionsargumente für create_user()."))

        return password

    def email_validator(self, email):
        try:
            validate_email(email)
            return True
        except ValidationError:
            raise ValueError(_("Die Email ist nicht gültig!"))

    def create_user(
        self,
        username,
        *args,
        password=None,
        email=None,
        roles=None,
        **extra_fields
    ):
        if not username:
            raise ValueError(_("Benutzer müssen einen Benutzernamen haben!"))

        password = self._extract_password(args, password, extra_fields)

        if email:
            email = self.normalize_email(email)
            self.email_validator(email)

        extra_fields.setdefault("is_superuser", False)

        user = self.model(
            username=username,
            email=email,
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)

        # Rollen setzen, falls übergeben (über self.model.Role zugreifen)
        if roles:
            Role = self.model.roles.rel.model  # Zugriff auf Role-Modell über User.roles
            role_objs = Role.objects.filter(key__in=roles)
            user.roles.set(role_objs)

        return user

    def create_superuser(
        self,
        username,
        *args,
        password=None,
        email=None,
        **extra_fields
    ):
        password = self._extract_password(args, password, extra_fields)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser müssen is_superuser=True haben!"))
        if not password:
            raise ValueError(_("Superuser müssen ein Passwort haben!"))

        return self.create_user(
            username=username,
            password=password,
            email=email,
            roles=["ADMIN"],
            **extra_fields
        )
