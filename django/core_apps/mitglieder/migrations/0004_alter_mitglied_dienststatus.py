from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0003_jugend_fields_and_events"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mitglied",
            name="dienststatus",
            field=models.CharField(
                choices=[("JUGEND", "Jugend"), ("AKTIV", "Aktiv"), ("RESERVE", "Reserve")],
                default="AKTIV",
                max_length=20,
                verbose_name="Dienststatus",
            ),
        ),
    ]
