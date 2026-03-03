from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0007_mitglied_status_abgemeldet_and_stbnr_unique"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="mitglied",
            name="jugend_bewerb",
        ),
        migrations.RemoveField(
            model_name="mitglied",
            name="jugend_erprobung",
        ),
        migrations.RemoveField(
            model_name="mitglied",
            name="jugend_fertigkeitsabzeichen",
        ),
        migrations.RemoveField(
            model_name="mitglied",
            name="jugend_wissentest",
        ),
    ]
