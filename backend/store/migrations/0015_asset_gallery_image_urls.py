from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0014_notifyrequest_adminactivitylog"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="gallery_image_urls",
            field=models.TextField(blank=True),
        ),
    ]
