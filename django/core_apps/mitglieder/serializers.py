from rest_framework import serializers

from .models import Mitglied


class MitgliedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mitglied
        fields = '__all__'
