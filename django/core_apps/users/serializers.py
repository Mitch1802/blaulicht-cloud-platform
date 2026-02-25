from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, Role

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        many=True,
        slug_field="key",
        queryset=Role.objects.none(),
        required=False
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._ensure_roles_from_initial_data()
        self.fields["roles"].queryset = Role.objects.all()

    def _ensure_roles_from_initial_data(self):
        initial = getattr(self, "initial_data", None)
        if not isinstance(initial, dict):
            return

        incoming_roles = initial.get("roles")
        if incoming_roles is None:
            return

        if isinstance(incoming_roles, str):
            roles_list = [incoming_roles]
        elif isinstance(incoming_roles, list):
            roles_list = incoming_roles
        else:
            roles_list = [incoming_roles]

        for role_entry in roles_list:
            if isinstance(role_entry, str):
                role_key = role_entry.strip()
            elif isinstance(role_entry, dict):
                role_key = str(role_entry.get("key") or role_entry.get("id") or "").strip()
            else:
                role_key = str(role_entry).strip()

            if not role_key:
                continue

            Role.objects.get_or_create(
                key=role_key,
                defaults={"verbose_name": role_key.replace("_", " ").title()},
            )

    def update(self, instance, validated_data):
        if instance.is_superuser:
            validated_data.pop("username", None)

        roles = validated_data.pop("roles", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

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

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "password1", "password2", "roles")

    def validate(self, attrs):
        if attrs["password1"] != attrs["password2"]:
            raise serializers.ValidationError("Passwörter stimmen nicht überein.")
        validate_password(attrs["password1"])
        return attrs

    def create(self, validated_data):
        roles = validated_data.pop("roles")
        pwd = validated_data.pop("password1")
        validated_data.pop("password2", None)

        user = User(**validated_data)
        user.set_password(pwd)
        user.save()

        # roles setzen (dein Role Modell nutzt key)
        role_qs = Role.objects.filter(key__in=roles)
        user.roles.set(role_qs)

        return user

class UserSelfSerializer(serializers.ModelSerializer):
    roles = serializers.SlugRelatedField(
        many=True,
        slug_field='key',
        read_only=True
    )

    class Meta:
        model = User
        # NUR das, was ein User selbst ändern darf:
        fields = ("id", "username", "first_name", "last_name", "roles", "is_superuser")
        read_only_fields = ("id", "roles", "is_superuser")

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)