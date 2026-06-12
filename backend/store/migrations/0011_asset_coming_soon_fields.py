from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0010_sitesetting"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="coming_soon_badge",
            field=models.CharField(default="COMING SOON", max_length=40),
        ),
        migrations.AddField(
            model_name="asset",
            name="coming_soon_banner_title",
            field=models.CharField(blank=True, max_length=180),
        ),
        migrations.AddField(
            model_name="asset",
            name="coming_soon_button_text",
            field=models.CharField(default="Notify Me", max_length=60),
        ),
        migrations.AddField(
            model_name="asset",
            name="coming_soon_message",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="asset",
            name="coming_soon_status_text",
            field=models.CharField(default="Release Date: To Be Announced", max_length=120),
        ),
    ]
