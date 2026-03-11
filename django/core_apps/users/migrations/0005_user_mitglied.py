import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0008_remove_mitglied_jugend_fields"),
        ("users", "0004_remove_user_is_staff"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="mitglied",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="benutzer",
                to="mitglieder.mitglied",
                verbose_name="Mitglied",
            ),
        ),
    ]
