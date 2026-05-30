from io import BytesIO
from decimal import Decimal
from zipfile import ZIP_DEFLATED, ZipFile

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from store.models import Asset, Category, UpdateLog


class Command(BaseCommand):
    help = "Seed sample MSTS and Open Rails assets for local development."

    def build_demo_package(self, asset):
        package = BytesIO()
        with ZipFile(package, "w", ZIP_DEFLATED) as archive:
            archive.writestr(
                "README.txt",
                "\n".join(
                    [
                        asset.title,
                        f"Version: {asset.version}",
                        f"Simulator: {asset.get_simulator_type_display()}",
                        "",
                        "This is a local development demo package.",
                        "Replace it from the admin dashboard with the real GJS Production asset archive before launch.",
                    ]
                ),
            )
            archive.writestr("INSTALL.txt", asset.installation_steps or "Extract into your simulator folder.")
        return ContentFile(package.getvalue())

    def handle(self, *args, **options):
        categories = [
            ("Trains", "Diesel, electric, and coach models", "train"),
            ("Routes", "Playable railway routes and activities", "route"),
            ("Sounds", "Horn, engine, track, and ambience packs", "sound"),
            ("Cab Views", "High-resolution driving cab panels", "cab"),
            ("Textures", "Liveries, weathering, and scenery textures", "texture"),
            ("Free Downloads", "Community-ready free assets", "download"),
            ("Premium Downloads", "Paid production-grade packs", "premium"),
        ]

        category_map = {}
        for name, description, icon in categories:
            category, _ = Category.objects.get_or_create(
                name=name,
                defaults={"description": description, "icon": icon},
            )
            category_map[name] = category

        assets = [
            {
                "title": "GJS WDM-3A Diesel Locomotive Pack",
                "category": "Trains",
                "short_description": "Premium Indian diesel locomotive with detailed textures and Open Rails tuning.",
                "description": "A cinematic GJS Production WDM-3A pack with multiple liveries, tuned physics, cab references, and activity-ready consist files.",
                "simulator_type": "BOTH",
                "version": "2.1.0",
                "file_size": "485 MB",
                "price": Decimal("349.00"),
                "is_free": False,
                "is_featured": True,
            },
            {
                "title": "Konkan Coastal Route Demo",
                "category": "Routes",
                "short_description": "Free route demo with coastal scenery, tunnels, and monsoon ambience.",
                "description": "A compact showcase route for MSTS and Open Rails featuring cinematic coastal sections and starter activities.",
                "simulator_type": "OPEN_RAILS",
                "version": "1.0.0",
                "file_size": "720 MB",
                "price": Decimal("0.00"),
                "is_free": True,
                "is_featured": True,
            },
            {
                "title": "Indian Rail Horn and Track Sound Suite",
                "category": "Sounds",
                "short_description": "Layered horn, engine idle, brake, flange, and track ambience sound pack.",
                "description": "A clean sound suite for creators who want punchier Open Rails ambience with balanced volume levels.",
                "simulator_type": "BOTH",
                "version": "1.4.2",
                "file_size": "160 MB",
                "price": Decimal("149.00"),
                "is_free": False,
                "is_featured": False,
            },
            {
                "title": "Classic MSTS Cab View Starter Kit",
                "category": "Cab Views",
                "short_description": "Free HD cab panels for building and testing MSTS locomotive releases.",
                "description": "Includes ready-to-edit cab view templates, night variants, and installation notes for beginners.",
                "simulator_type": "MSTS",
                "version": "1.2.0",
                "file_size": "92 MB",
                "price": Decimal("0.00"),
                "is_free": True,
                "is_featured": False,
            },
        ]

        for item in assets:
            asset, created = Asset.objects.update_or_create(
                title=item["title"],
                defaults={
                    **item,
                    "category": category_map[item["category"]],
                    "requirements": "MSTS Bin recommended. Open Rails latest stable build for OR-specific physics.",
                    "installation_steps": "Download the archive, extract into your simulator folder, then read the included install notes.",
                    "changelog": "Initial seeded release for local demo data.",
                },
            )
            UpdateLog.objects.get_or_create(asset=asset, version=asset.version, defaults={"changelog": asset.changelog})
            if not asset.download_file:
                filename = f"{asset.slug}-demo-v{asset.version}.zip"
                asset.download_file.save(filename, self.build_demo_package(asset), save=True)
            self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} {asset.title}"))
