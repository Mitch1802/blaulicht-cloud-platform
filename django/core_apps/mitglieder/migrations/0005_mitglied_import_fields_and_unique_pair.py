from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0004_alter_mitglied_dienststatus"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mitglied",
            name="stbnr",
            field=models.IntegerField(verbose_name="Standesbuchnummer"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="dienstgrad",
            field=models.CharField(blank=True, max_length=50, verbose_name="Dienstgrad"),
        ),
        migrations.AddField(
            model_name="mitglied",
            name="abgemeldet",
            field=models.BooleanField(default=False, verbose_name="Abgemeldet"),
        ),
        migrations.AddConstraint(
            model_name="mitglied",
            constraint=models.UniqueConstraint(fields=("stbnr", "geburtsdatum"), name="uniq_mitglied_stbnr_geburtsdatum"),
        ),
    ]
