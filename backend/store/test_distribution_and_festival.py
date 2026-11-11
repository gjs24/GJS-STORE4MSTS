import datetime
from decimal import Decimal
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, force_authenticate

from store.festival import get_live_festival_data, get_upcoming_festival_data
from store.models import (
    Asset,
    AssetFeatureAddon,
    Category,
    FestivalAssetPrice,
    FestivalSchedule,
    Order,
    SiteSetting,
    UserAssetAddonUnlock,
)
from store.serializers import AssetDetailSerializer, AssetListSerializer
from store.views import (
    AdminAssetViewSet,
    AdminFestivalScheduleViewSet,
    OrderCreateView,
    addon_download_by_id,
    create_download_response,
    site_settings,
)


@override_settings(MANUAL_UPI_ID="admin@upi", CASHFREE_CLIENT_ID="", CASHFREE_CLIENT_SECRET="", RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class DistributionStoppedTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.category = Category.objects.create(name="Trains", slug="trains-dist")
        self.owner = User.objects.create_user(username="owner_user", password="password123", email="owner@test.com")
        self.other = User.objects.create_user(username="other_user", password="password123", email="other@test.com")
        self.staff = User.objects.create_user(
            username="staff_admin", password="password123", email="admin@test.com", is_staff=True
        )

        self.paid_asset = Asset.objects.create(
            title="Vande Bharat Sleeper",
            slug="vb-sleeper-dist",
            category=self.category,
            short_description="Detailed orange sleeper rake",
            price=Decimal("299.00"),
            original_price=Decimal("499.00"),
            is_published=True,
            external_download_url="https://example.com/vb-sleeper.zip",
            distribution_stopped=True,
            distribution_stopped_reason="Temporarily Stopped",
            distribution_stopped_message="Sales paused while upgrading coach textures.",
            distribution_stop_downloads=False,
        )
        Order.objects.create(
            user=self.owner,
            asset=self.paid_asset,
            amount=Decimal("299.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
        )

        self.unlocked_addon = AssetFeatureAddon.objects.create(
            asset=self.paid_asset,
            title="Interior Pack",
            slug="interior-pack",
            version="1.1.0",
            upgrade_price=Decimal("20.00"),
            bundle_price_addition=Decimal("10.00"),
            external_download_url="https://example.com/interior.zip",
            is_active=True,
        )
        Order.objects.create(
            user=self.owner,
            asset=self.paid_asset,
            asset_addon=self.unlocked_addon,
            order_type=Order.OrderType.UPGRADE,
            amount=Decimal("20.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
        )
        UserAssetAddonUnlock.objects.create(user=self.owner, addon=self.unlocked_addon)

        self.locked_addon = AssetFeatureAddon.objects.create(
            asset=self.paid_asset,
            title="Sound Pack",
            slug="sound-pack",
            version="1.2.0",
            upgrade_price=Decimal("30.00"),
            bundle_price_addition=Decimal("20.00"),
            external_download_url="https://example.com/sound.zip",
            is_active=True,
        )

        self.free_asset = Asset.objects.create(
            title="Free Route Marker",
            slug="free-route-marker",
            category=self.category,
            short_description="Free track utility",
            price=Decimal("0.00"),
            is_free=True,
            is_published=True,
            external_download_url="https://example.com/free.zip",
            distribution_stopped=True,
            distribution_stopped_reason="Distribution Paused",
            distribution_stopped_message="Maintenance in progress.",
            distribution_stop_downloads=False,
        )

    def test_distribution_stopped_blocks_new_purchases_updates_addons_and_non_owner_free(self):
        order_view = OrderCreateView.as_view()

        # New buyer cannot purchase base product
        req_buy = self.factory.post("/api/orders/create/", {"asset_id": self.paid_asset.id}, format="json")
        force_authenticate(req_buy, user=self.other)
        resp_buy = order_view(req_buy)
        self.assertEqual(resp_buy.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(resp_buy.data["detail"], self.paid_asset.distribution_stopped_message)

        # Existing owner cannot buy locked addon while distribution stopped
        req_addon = self.factory.post("/api/orders/create/", {"asset_addon_id": self.locked_addon.id}, format="json")
        force_authenticate(req_addon, user=self.owner)
        resp_addon = order_view(req_addon)
        self.assertEqual(resp_addon.status_code, status.HTTP_400_BAD_REQUEST)

        # Existing owner cannot buy paid version update while distribution stopped
        self.paid_asset.has_paid_update = True
        self.paid_asset.update_price = Decimal("10.00")
        self.paid_asset.paid_update_version = "1.1.0"
        self.paid_asset.update_released_at = timezone.now() + datetime.timedelta(minutes=5)
        self.paid_asset.save()

        req_upd = self.factory.post("/api/orders/create/", {"asset_id": self.paid_asset.id, "is_update": True}, format="json")
        force_authenticate(req_upd, user=self.owner)
        resp_upd = order_view(req_upd)
        self.assertEqual(resp_upd.status_code, status.HTTP_400_BAD_REQUEST)

        # Non-owner cannot download stopped free asset
        req_free_detail = self.factory.get(f"/api/assets/{self.free_asset.slug}/")
        force_authenticate(req_free_detail, user=self.other)
        free_detail = AssetDetailSerializer(self.free_asset, context={"request": Request(req_free_detail)}).data
        self.assertFalse(free_detail["can_download"])

        req_free_dl = self.factory.get(f"/api/assets/{self.free_asset.slug}/download/")
        req_free_dl.user = self.other
        resp_free_dl = create_download_response(req_free_dl, self.free_asset)
        self.assertEqual(resp_free_dl.status_code, status.HTTP_403_FORBIDDEN)

    def test_existing_owner_download_behavior_with_stop_downloads_toggle(self):
        # 1. distribution_stop_downloads=False -> existing paid owner keeps asset & unlocked addon download access
        req_dl = self.factory.get(f"/api/assets/{self.paid_asset.slug}/download/")
        req_dl.user = self.owner
        resp_dl = create_download_response(req_dl, self.paid_asset)
        self.assertEqual(resp_dl.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_dl.data["download_url"], "https://example.com/vb-sleeper.zip")

        req_addon_dl = self.factory.get(f"/api/addons/{self.unlocked_addon.id}/download/")
        force_authenticate(req_addon_dl, user=self.owner)
        req_addon_dl.user = self.owner
        resp_addon_dl = addon_download_by_id(req_addon_dl, self.unlocked_addon.id)
        self.assertEqual(resp_addon_dl.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_addon_dl.data["download_url"], "https://example.com/interior.zip")

        # 2. distribution_stop_downloads=True -> non-staff downloads (base + addon) are paused too
        self.paid_asset.distribution_stop_downloads = True
        self.paid_asset.save()

        req_detail = self.factory.get(f"/api/assets/{self.paid_asset.slug}/")
        force_authenticate(req_detail, user=self.owner)
        detail = AssetDetailSerializer(self.paid_asset, context={"request": Request(req_detail)}).data
        self.assertFalse(detail["can_download"])

        resp_dl_paused = create_download_response(req_dl, self.paid_asset)
        self.assertEqual(resp_dl_paused.status_code, status.HTTP_403_FORBIDDEN)

        req_addon_paused = self.factory.get(f"/api/addons/{self.unlocked_addon.id}/download/")
        force_authenticate(req_addon_paused, user=self.owner)
        req_addon_paused.user = self.owner
        resp_addon_paused = addon_download_by_id(req_addon_paused, self.unlocked_addon.id)
        self.assertEqual(resp_addon_paused.status_code, status.HTTP_403_FORBIDDEN)

        # Staff retains download access even when distribution_stop_downloads=True
        req_staff_dl = self.factory.get(f"/api/assets/{self.paid_asset.slug}/download/")
        req_staff_dl.user = self.staff
        resp_staff = create_download_response(req_staff_dl, self.paid_asset)
        self.assertEqual(resp_staff.status_code, status.HTTP_200_OK)


@override_settings(MANUAL_UPI_ID="admin@upi", CASHFREE_CLIENT_ID="", CASHFREE_CLIENT_SECRET="", RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class FestivalScheduleAndPricingTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.category = Category.objects.create(name="Locos", slug="locos-fest")
        self.customer = User.objects.create_user(username="fest_buyer", password="password123", email="buyer@test.com")
        self.staff = User.objects.create_user(
            username="fest_admin", password="password123", email="festadmin@test.com", is_staff=True
        )

        self.asset_fixed = Asset.objects.create(
            title="WDP4D Festive Edition",
            slug="wdp4d-festive",
            category=self.category,
            short_description="Diesel loco",
            price=Decimal("299.00"),
            original_price=Decimal("499.00"),
            is_published=True,
        )
        self.asset_excluded = Asset.objects.create(
            title="Excluded Coach Pack",
            slug="excluded-coach",
            category=self.category,
            short_description="No discount item",
            price=Decimal("400.00"),
            is_published=True,
        )
        self.asset_fallback = Asset.objects.create(
            title="Percent Fallback Pack",
            slug="percent-fallback",
            category=self.category,
            short_description="Uses schedule percent discount",
            price=Decimal("500.00"),
            is_published=True,
        )
        self.asset_default_fp = Asset.objects.create(
            title="Product Level Festival Price",
            slug="product-level-fp",
            category=self.category,
            short_description="Uses Asset.festival_price",
            price=Decimal("300.00"),
            festival_price=Decimal("199.00"),
            is_published=True,
        )
        self.asset_zero_promo = Asset.objects.create(
            title="Festival Zero Promo Pack",
            slug="festival-zero-promo",
            category=self.category,
            short_description="Temporarily zero during festival",
            price=Decimal("199.00"),
            is_free=False,
            is_published=True,
            external_download_url="https://example.com/zero-promo.zip",
        )

    def test_future_and_expired_schedules_do_not_activate_and_surface_upcoming(self):
        now = timezone.now()
        future = FestivalSchedule.objects.create(
            name="Pongal Sale",
            theme_type="PONGAL",
            title="Pongal Harvest Sale",
            badge="PONGAL SPECIAL",
            discount_percent=25,
            starts_at=now + datetime.timedelta(days=2),
            ends_at=now + datetime.timedelta(days=5),
            is_active=True,
        )
        FestivalSchedule.objects.create(
            name="Old Sale",
            theme_type="DIWALI",
            title="Expired Sale",
            badge="EXPIRED",
            discount_percent=50,
            starts_at=now - datetime.timedelta(days=5),
            ends_at=now - datetime.timedelta(seconds=1),
            is_active=True,
        )

        self.assertIsNone(get_live_festival_data(now=now))
        upcoming = get_upcoming_festival_data(now=now)
        self.assertIsNotNone(upcoming)
        self.assertEqual(upcoming["schedule_id"], future.id)

        req_site = self.factory.get("/api/site-settings/")
        resp_site = site_settings(req_site)
        self.assertEqual(resp_site.status_code, status.HTTP_200_OK)
        self.assertFalse(resp_site.data["festival_theme_enabled"])
        self.assertEqual(resp_site.data["upcoming_festival"]["name"], "Pongal Sale")

        req_asset = self.factory.get(f"/api/assets/{self.asset_fixed.slug}/")
        data = AssetDetailSerializer(self.asset_fixed, context={"request": Request(req_asset)}).data
        self.assertEqual(data["price"], "299.00")
        self.assertFalse(data["festival_offer_active"])

    def test_priority_predefined_prices_exclusions_admin_raw_and_order_checkout(self):
        now = timezone.now()
        FestivalSchedule.objects.create(
            name="Low Priority Promo",
            theme_type="GENERIC",
            title="10% Off",
            badge="LOW PRIO",
            discount_percent=10,
            priority=1,
            starts_at=now - datetime.timedelta(hours=2),
            ends_at=now + datetime.timedelta(days=1),
            is_active=True,
        )
        high = FestivalSchedule.objects.create(
            name="Diwali Mega Sale",
            theme_type="DIWALI",
            title="Diwali Express Mega Sale",
            badge="DIWALI MEGA",
            discount_percent=20,
            priority=10,
            apply_discount_to_prices=True,
            starts_at=now - datetime.timedelta(hours=1),
            ends_at=now + datetime.timedelta(days=2),
            is_active=True,
        )
        FestivalAssetPrice.objects.create(festival=high, asset=self.asset_fixed, festival_price=Decimal("149.00"), is_included=True)
        FestivalAssetPrice.objects.create(festival=high, asset=self.asset_excluded, festival_price=None, is_included=False)
        FestivalAssetPrice.objects.create(festival=high, asset=self.asset_zero_promo, festival_price=Decimal("0.00"), is_included=True)

        # Public site settings shows winning higher-priority schedule
        req_site = self.factory.get("/api/site-settings/")
        resp_site = site_settings(req_site)
        self.assertTrue(resp_site.data["festival_theme_enabled"])
        self.assertEqual(resp_site.data["festival_badge"], "DIWALI MEGA")
        self.assertEqual(resp_site.data["active_festival_schedule_id"], high.id)

        # Serialized prices match defined rules
        req_cust = self.factory.get("/api/assets/")
        force_authenticate(req_cust, user=self.customer)
        ctx = {"request": Request(req_cust)}

        d_fixed = AssetDetailSerializer(self.asset_fixed, context=ctx).data
        self.assertEqual(d_fixed["price"], "149.00")
        self.assertEqual(d_fixed["regular_price"], "299.00")
        self.assertEqual(d_fixed["user_effective_price"], "149.00")
        self.assertTrue(d_fixed["festival_offer_active"])
        self.assertEqual(d_fixed["festival_badge"], "DIWALI MEGA")

        d_excluded = AssetDetailSerializer(self.asset_excluded, context=ctx).data
        self.assertEqual(d_excluded["price"], "400.00")
        self.assertFalse(d_excluded["festival_offer_active"])

        d_fallback = AssetDetailSerializer(self.asset_fallback, context=ctx).data
        self.assertEqual(d_fallback["price"], "400.00")  # 20% off 500.00
        self.assertTrue(d_fallback["festival_offer_active"])

        d_default_fp = AssetDetailSerializer(self.asset_default_fp, context=ctx).data
        self.assertEqual(d_default_fp["price"], "199.00")  # uses Asset.festival_price
        self.assertTrue(d_default_fp["festival_offer_active"])

        d_zero = AssetDetailSerializer(self.asset_zero_promo, context=ctx).data
        self.assertEqual(d_zero["price"], "0.00")
        self.assertTrue(d_zero["festival_offer_active"])
        self.assertFalse(d_zero["is_free"])  # Preserves paid order pipeline for ₹0.00 promo claim

        # Admin raw view preserves un-discounted regular price
        admin_view = AdminAssetViewSet.as_view({"get": "retrieve"})
        req_admin = self.factory.get(f"/api/admin/assets/{self.asset_fixed.id}/")
        force_authenticate(req_admin, user=self.staff)
        resp_admin = admin_view(req_admin, pk=self.asset_fixed.id)
        self.assertEqual(resp_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_admin.data["price"], "299.00")

        # Checkout orders match exact festival prices (including ₹0.00 instant unlock)
        order_view = OrderCreateView.as_view()

        req_ord_fixed = self.factory.post("/api/orders/create/", {"asset_id": self.asset_fixed.id}, format="json")
        force_authenticate(req_ord_fixed, user=self.customer)
        resp_ord_fixed = order_view(req_ord_fixed)
        self.assertEqual(resp_ord_fixed.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_ord_fixed.data["amount"], "149.00")

        req_ord_excl = self.factory.post("/api/orders/create/", {"asset_id": self.asset_excluded.id}, format="json")
        force_authenticate(req_ord_excl, user=self.customer)
        resp_ord_excl = order_view(req_ord_excl)
        self.assertEqual(resp_ord_excl.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_ord_excl.data["amount"], "400.00")

        req_ord_zero = self.factory.post("/api/orders/create/", {"asset_id": self.asset_zero_promo.id}, format="json")
        force_authenticate(req_ord_zero, user=self.customer)
        resp_ord_zero = order_view(req_ord_zero)
        self.assertEqual(resp_ord_zero.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp_ord_zero.data["amount"], "0.00")
        self.assertEqual(resp_ord_zero.data["status"], Order.Status.APPROVED)
        self.assertTrue(resp_ord_zero.data["download_enabled"])

        # User who claimed the ₹0.00 festival offer can download immediately
        req_zero_dl = self.factory.get(f"/api/assets/{self.asset_zero_promo.slug}/download/")
        req_zero_dl.user = self.customer
        resp_zero_dl = create_download_response(req_zero_dl, self.asset_zero_promo)
        self.assertEqual(resp_zero_dl.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_zero_dl.data["download_url"], "https://example.com/zero-promo.zip")

    def test_site_setting_scheduled_window_and_admin_festival_api(self):
        now = timezone.now()
        site = SiteSetting.load()
        site.festival_theme_enabled = True
        site.festival_schedule_enabled = True
        site.festival_starts_at = now - datetime.timedelta(hours=1)
        site.festival_ends_at = now + datetime.timedelta(hours=5)
        site.festival_discount_percent = 30
        site.festival_apply_discount_to_prices = True
        site.festival_badge = "FLASH FEST"
        site.save()

        req_list = self.factory.get(f"/api/assets/{self.asset_fallback.slug}/")
        data_active = AssetListSerializer(self.asset_fallback, context={"request": Request(req_list)}).data
        self.assertEqual(data_active["price"], "350.00")  # 30% off 500.00
        self.assertTrue(data_active["festival_offer_active"])

        # Move ends_at to the past -> discount stops immediately
        site.festival_ends_at = now - datetime.timedelta(seconds=5)
        site.save()
        data_expired = AssetListSerializer(self.asset_fallback, context={"request": Request(req_list)}).data
        self.assertEqual(data_expired["price"], "500.00")
        self.assertFalse(data_expired["festival_offer_active"])

        # Admin Festival Schedule API permissions and nested asset_prices creation
        sched_view = AdminFestivalScheduleViewSet.as_view({"get": "list", "post": "create"})
        payload = {
            "name": "Christmas Express",
            "theme_type": "NEW_YEAR",
            "title": "Christmas Sale",
            "badge": "XMAS",
            "discount_percent": 15,
            "priority": 5,
            "apply_discount_to_prices": True,
            "starts_at": (now + datetime.timedelta(days=1)).isoformat(),
            "ends_at": (now + datetime.timedelta(days=3)).isoformat(),
            "is_active": True,
            "asset_prices": [
                {"asset": self.asset_fixed.id, "festival_price": "199.00", "is_included": True},
                {"asset": self.asset_excluded.id, "festival_price": None, "is_included": False},
            ],
        }

        req_unauth = self.factory.post("/api/admin/festivals/", payload, format="json")
        force_authenticate(req_unauth, user=self.customer)
        self.assertEqual(sched_view(req_unauth).status_code, status.HTTP_403_FORBIDDEN)

        req_staff = self.factory.post("/api/admin/festivals/", payload, format="json")
        force_authenticate(req_staff, user=self.staff)
        resp_create = sched_view(req_staff)
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp_create.data["asset_prices"]), 2)
        self.assertEqual(
            FestivalAssetPrice.objects.get(festival_id=resp_create.data["id"], asset=self.asset_fixed).festival_price,
            Decimal("199.00"),
        )

