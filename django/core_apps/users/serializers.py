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
        self.fields["roles"].queryset = Role.objects.all()

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
        fields = '__all__'

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
        fields = ["id", "username", "roles"]

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
    roles = serializers.ListField(child=serializers.CharField(), required=True)

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
