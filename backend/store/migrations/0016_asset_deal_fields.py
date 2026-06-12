from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0015_asset_gallery_image_urls"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="deal_badge",
            field=models.CharField(default="Limited Time", max_length=60),
        ),
        migrations.AddField(
            model_name="asset",
            name="deal_ends_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="asset",
            name="deal_is_open",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="asset",
            name="deal_status_text",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="asset",
            name="deal_title",
            field=models.CharField(default="Launch Offer", max_length=120),
        ),
    ]
