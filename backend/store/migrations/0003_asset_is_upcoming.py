from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0002_asset_is_published"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="is_upcoming",
            field=models.BooleanField(default=False),
        ),
    ]
