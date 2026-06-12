from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0009_asset_google_drive_file_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("hero_image_url", models.URLField(blank=True)),
                ("hero_image_alt", models.CharField(default="MSTS-GJS Production Store railway asset preview", max_length=180)),
                ("popup_enabled", models.BooleanField(default=False)),
                ("popup_title", models.CharField(default="Welcome to MSTS-GJS Production Store", max_length=120)),
                ("popup_message", models.TextField(blank=True)),
                ("popup_button_text", models.CharField(default="Browse assets", max_length=60)),
                ("popup_button_url", models.CharField(default="/assets", max_length=200)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Site setting",
                "verbose_name_plural": "Site settings",
            },
        ),
    ]
