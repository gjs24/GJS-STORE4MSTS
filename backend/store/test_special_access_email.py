from datetime import timedelta
from decimal import Decimal
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .early_access import calculate_early_access_status
from .models import Asset, Category, SiteSetting, UserSpecialAccess
from .serializers import AssetDetailSerializer, AssetWriteSerializer
from .views import send_special_access_email


class StoreTimersAndSpecialAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="railfan",
            email="railfan@example.com",
            password="password123",
        )
        self.category = Category.objects.create(
            name="Trains",
            slug="trains",
            description="Train packs",
        )

    def test_asset_timer_fields_serialization_and_sanitization(self):
        now = timezone.now()
        asset = Asset.objects.create(
            title="Vande Bharat Express",
            slug="vande-bharat-express",
            category=self.category,
            short_description="VB Pack",
            description="Full VB Pack",
            is_free=False,
            original_price=Decimal("499.00"),
            price=Decimal("349.00"),
            is_upcoming=True,
            release_date=now + timedelta(days=5),
            deal_is_open=True,
            deal_starts_at=now + timedelta(hours=2),
            deal_ends_at=now + timedelta(days=3),
            prebooking_enabled=True,
            prebooking_price=Decimal("249.00"),
            prebooking_starts_at=now - timedelta(hours=1),
            prebooking_ends_at=now + timedelta(days=2),
            prebooking_download_unlock_at=now + timedelta(days=4),
        )

        serialized = AssetDetailSerializer(asset).data
        self.assertIsNotNone(serialized["deal_starts_at"])
        self.assertIsNotNone(serialized["deal_ends_at"])
        self.assertIsNotNone(serialized["prebooking_starts_at"])
        self.assertIsNotNone(serialized["prebooking_ends_at"])
        self.assertIsNotNone(serialized["release_date"])

        # Verify active prebooking window applies prebooking_price
        ea_active = calculate_early_access_status(asset, self.user)
        self.assertTrue(ea_active["is_prebooking"])
        self.assertEqual(ea_active["effective_price"], Decimal("249.00"))

        # Verify future prebooking_starts_at keeps prebooking closed until start time
        asset.prebooking_starts_at = now + timedelta(hours=5)
        asset.save()
        ea_pending = calculate_early_access_status(asset, self.user)
        self.assertFalse(ea_pending["is_prebooking"])
        self.assertEqual(ea_pending["effective_price"], Decimal("349.00"))

        # Verify past prebooking_ends_at closes prebooking
        asset.prebooking_starts_at = now - timedelta(days=2)
        asset.prebooking_ends_at = now - timedelta(hours=1)
        asset.save()
        ea_closed = calculate_early_access_status(asset, self.user)
        self.assertFalse(ea_closed["is_prebooking"])
        self.assertEqual(ea_closed["effective_price"], Decimal("349.00"))

        # Verify AssetWriteSerializer cleans empty strings to None for new timer fields
        write_ser = AssetWriteSerializer(
            instance=asset,
            data={
                "deal_starts_at": "",
                "deal_ends_at": "",
                "prebooking_starts_at": "",
                "prebooking_ends_at": "",
            },
            partial=True,
        )
        self.assertTrue(write_ser.is_valid(), write_ser.errors)
        updated = write_ser.save()
        self.assertIsNone(updated.deal_starts_at)
        self.assertIsNone(updated.deal_ends_at)
        self.assertIsNone(updated.prebooking_starts_at)
        self.assertIsNone(updated.prebooking_ends_at)

    def test_special_access_email_template_rendering(self):
        setting = SiteSetting.load()
        setting.special_access_email_subject = "VIP Access for {username}"
        setting.special_access_email_body = "Hello {username}, unlocked: {granted_items} ({access_type})"
        setting.save()

        access = UserSpecialAccess.objects.create(
            user=self.user,
            is_all_access_free=True,
        )
        ok, err = send_special_access_email(self.user, access)
        self.assertTrue(ok, err)
