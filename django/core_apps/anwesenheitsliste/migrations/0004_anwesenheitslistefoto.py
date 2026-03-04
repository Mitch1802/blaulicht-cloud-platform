import core_apps.anwesenheitsliste.models
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("anwesenheitsliste", "0003_m2m_mitglieder"),
    ]

    operations = [
        migrations.CreateModel(
            name="AnwesenheitslisteFoto",
            fields=[
                ("pkid", models.BigAutoField(editable=False, primary_key=True, serialize=False, unique=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "foto",
                    models.ImageField(upload_to=core_apps.anwesenheitsliste.models.anwesenheitsliste_foto_path, verbose_name="Foto"),
                ),
                (
                    "anwesenheitsliste",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fotos",
                        to="anwesenheitsliste.anwesenheitsliste",
                    ),
                ),
            ],
            options={
                "ordering": ["pkid"],
            },
        ),
    ]
