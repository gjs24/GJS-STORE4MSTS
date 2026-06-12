from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0011_asset_coming_soon_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="scroller_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="scroller_message",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
