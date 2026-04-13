from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_remove_first_last_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="last_invite_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]