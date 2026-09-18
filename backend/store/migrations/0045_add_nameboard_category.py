from django.db import migrations


def create_nameboard_category(apps, schema_editor):
    Category = apps.get_model("store", "Category")
    Category.objects.get_or_create(
        slug="nameboard",
        defaults={
            "name": "Nameboard",
            "description": "Coach and locomotive LED dot-matrix destination nameboards & board templates",
            "icon": "nameboard",
            "is_active": True,
        },
    )


def remove_nameboard_category(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0044_boardtemplate_allow_user_edit_texture_name"),
    ]

    operations = [
        migrations.RunPython(create_nameboard_category, remove_nameboard_category),
    ]
