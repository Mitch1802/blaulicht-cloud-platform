from rest_framework import serializers

from .models import Anwesenheitsliste


class NullableDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in (None, ""):
            return None
        return super().to_internal_value(value)


class AnwesenheitslisteSerializer(serializers.ModelSerializer):
    datum = NullableDateField(
        format="%d.%m.%Y",
        input_formats=["%d.%m.%Y", "iso-8601"],
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Anwesenheitsliste
        fields = "__all__"
