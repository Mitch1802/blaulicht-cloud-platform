import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core_apps.common.email import send_welcome_email
from .models import User, Role

logger = logging.getLogger(__name__)

User = get_user_model()


class RoleKeyRelatedField(serializers.SlugRelatedField):
    def to_internal_value(self, data):
        role_key = str(data or "").strip()
        if not role_key:
            self.fail("does_not_exist", slug_name=self.slug_field, value=data)

        role, _ = Role.objects.get_or_create(
            key=role_key,
            defaults={"verbose_name": role_key.replace("_", " ").title()},
        )
        return role


class UserSerializer(serializers.ModelSerializer):
    roles = RoleKeyRelatedField(
        many=True,
        slug_field="key",
        queryset=Role.objects.none(),
        required=False
    )
    mitglied_id = serializers.SerializerMethodField()

    def get_mitglied_id(self, obj):
        # Django auto-generates `mitglied_id` as the integer FK column for the OneToOneField,
        # pointing to the primary key (pkid) of the related Mitglied object.
        return obj.mitglied_id

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["roles"].queryset = Role.objects.all()

    def update(self, instance, validated_data):
        if instance.is_superuser:
            validated_data.pop("username", None)

        roles = validated_data.pop("roles", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Handle mitglied_id from raw request data (not in validated_data since it's SerializerMethodField)
        if "mitglied_id" in self.initial_data:
            raw_mitglied_id = self.initial_data.get("mitglied_id")
            if raw_mitglied_id is not None:
                from core_apps.mitglieder.models import Mitglied
                try:
                    instance.mitglied = Mitglied.objects.get(pkid=int(raw_mitglied_id))
                except (Mitglied.DoesNotExist, ValueError, TypeError):
                    instance.mitglied = None
            else:
                instance.mitglied = None

        instance.save()

        if roles is not None:
            instance.roles.set(roles)

        return instance

    
    def delete(self, instance):
        if instance.is_superuser:
            raise serializers.ValidationError("Admin-Benutzer können nicht gelöscht werden!")
        instance.delete()

    class Meta:
        model = User
        fields = [
            "pkid",
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_superuser",
            "date_joined",
            "roles",
            "mitglied_id",
        ]
        read_only_fields = ["pkid", "id", "is_superuser", "date_joined"]

    def to_representation(self, instance):
        representation = super(UserSerializer, self).to_representation(instance)
        if instance.is_superuser:
            representation["admin"] = True
        return representation

class UserDetailSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        many=True,
        slug_field='key',
        queryset=Role.objects.all()
    )

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "roles"]

class ChangePasswordSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ('password',)

    def update(self, instance, validated_data):
        instance.set_password(validated_data['password'])
        instance.save()

        return instance

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'key', 'verbose_name']

class AdminCreateUserSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)
    roles = serializers.ListField(child=serializers.CharField(), required=True, write_only=True)
    mitglied_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "password1", "password2", "roles", "mitglied_id")

    def validate(self, attrs):
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError("Passwörter stimmen nicht überein.")
        validate_password(attrs["password1"])
        return attrs

    def create(self, validated_data):
        roles = validated_data.pop("roles")
        pwd = validated_data.pop("password1")
        validated_data.pop("password2", None)
        mitglied_pkid = validated_data.pop("mitglied_id", None)

        user = User(**validated_data)
        user.set_password(pwd)

        if mitglied_pkid is not None:
            from core_apps.mitglieder.models import Mitglied
            try:
                user.mitglied = Mitglied.objects.get(pkid=mitglied_pkid)
            except (Mitglied.DoesNotExist, ValueError, TypeError):
                pass

        user.save()

        # roles setzen (dein Role Modell nutzt key)
        role_qs = Role.objects.filter(key__in=roles)
        user.roles.set(role_qs)

        # Zugangsdaten per E-Mail senden, falls eine Adresse hinterlegt ist.
        # Hinweis: Das Senden des Klartext-Passworts ist nur bei admin-erstellten
        # Erstkonten akzeptabel. Nutzer sollten ihr Passwort nach dem ersten Login
        # umgehend ändern (Aufforderung ist in der E-Mail enthalten).
        send_welcome_email(
            username=user.username,
            password=pwd,
            email=user.email or "",
            first_name=user.first_name or "",
        )

        return user

class UserSelfSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        many=True,
        slug_field='key',
        read_only=True
    )
    mitglied_id = serializers.SerializerMethodField()

    def get_mitglied_id(self, obj):
        return obj.mitglied_id

    class Meta:
        model = User
        # Ein Benutzer kann nur seine E-Mail-Adresse selbst ändern.
        # Passwortänderung erfolgt über den separaten change_password-Endpunkt.
        fields = ("id", "username", "email", "roles", "mitglied_id")
        read_only_fields = ("id", "username", "roles", "mitglied_id")

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)