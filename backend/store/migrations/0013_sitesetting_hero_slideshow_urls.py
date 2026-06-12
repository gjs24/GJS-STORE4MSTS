from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0012_sitesetting_scroller"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="hero_slideshow_urls",
            field=models.TextField(blank=True),
        ),
    ]
