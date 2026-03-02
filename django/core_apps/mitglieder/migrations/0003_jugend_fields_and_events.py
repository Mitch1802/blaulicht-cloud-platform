import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0002_mitglied_hauptberuflich"),
    ]

    operations = [
        migrations.AddField(
            model_name="mitglied",
            name="aktiv_ueberstellt_am",
            field=models.DateField(blank=True, null=True, verbose_name="In Aktivstand überstellt am"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="dienststatus",
            field=models.CharField(choices=[("JUGEND", "Jugend"), ("AKTIV", "Aktiv")], default="AKTIV", max_length=20, verbose_name="Dienststatus"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="jugend_bewerb",
            field=models.CharField(blank=True, max_length=255, verbose_name="Bewerb"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="jugend_erprobung",
            field=models.CharField(blank=True, max_length=255, verbose_name="Erprobung"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="jugend_fertigkeitsabzeichen",
            field=models.CharField(blank=True, max_length=255, verbose_name="Fertigkeitsabzeichen"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="jugend_wissentest",
            field=models.BooleanField(default=False, verbose_name="Wissentest absolviert"),
        ),
        migrations.CreateModel(
            name="JugendEvent",
            fields=[
                ("pkid", models.BigAutoField(editable=False, primary_key=True, serialize=False, unique=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("titel", models.CharField(max_length=255, verbose_name="Titel")),
                ("datum", models.DateField(verbose_name="Datum")),
                ("notiz", models.TextField(blank=True, verbose_name="Notiz")),
            ],
            options={
                "ordering": ["-datum", "titel"],
            },
        ),
        migrations.CreateModel(
            name="JugendEventTeilnahme",
            fields=[
                ("pkid", models.BigAutoField(editable=False, primary_key=True, serialize=False, unique=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("event", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="teilnahmen", to="mitglieder.jugendevent")),
                ("mitglied", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="jugend_teilnahmen", to="mitglieder.mitglied")),
            ],
            options={
                "ordering": ["event", "mitglied"],
                "unique_together": {("event", "mitglied")},
            },
        ),
        migrations.AddField(
            model_name="jugendevent",
            name="teilnehmer",
            field=models.ManyToManyField(blank=True, related_name="jugend_events", through="mitglieder.JugendEventTeilnahme", to="mitglieder.mitglied"),
        ),
    ]
