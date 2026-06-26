from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0017_manual_upi_orders"),
    ]

    operations = [
        migrations.AlterField(
            model_name="payment",
            name="provider",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Manual"),
                    ("CASHFREE", "Cashfree"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
    ]
