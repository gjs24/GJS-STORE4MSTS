import json
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from store.models import Asset, Category, Order, Review, SiteSetting, Wishlist


class SecurityExposureTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Locomotives", slug="locomotives-sec")
        self.buyer = User.objects.create_user(
            username="paid_buyer",
            email="buyer@secretmail.com",
            password="password123",
            first_name="Buyer",
            last_name="One",
        )
        self.buyer.profile.phone_number = "9876501234"
        self.buyer.profile.save()

        self.other_user = User.objects.create_user(
            username="random_visitor",
            email="visitor@example.com",
            password="password123",
        )
        self.staff = User.objects.create_user(
            username="store_admin",
            email="admin@gjspro.store",
            password="password123",
            is_staff=True,
        )

        self.paid_asset = Asset.objects.create(
            title="VB Sleeper Orange",
            slug="vb-sleeper-orange-sec",
            category=self.category,
            short_description="Test paid release",
            price=Decimal("299.00"),
            original_price=Decimal("499.00"),
            is_published=True,
            google_drive_file_id="1iE36rJYt1xM-gZDmf_NKu2TrChwpff4G",
            external_download_url="https://secret-cdn.example.com/vb-sleeper.zip",
            private_download_key="private-releases/vb-sleeper-orange.zip",
        )
        Order.objects.create(
            user=self.buyer,
            asset=self.paid_asset,
            amount=Decimal("299.00"),
            status=Order.Status.PAID,
            download_enabled=True,
        )
        Review.objects.create(
            user=self.buyer,
            asset=self.paid_asset,
            rating=5,
            comment="Super smooth interior textures!",
            is_approved=True,
        )

        self.free_stopped_asset = Asset.objects.create(
            title="Free Stopped Coach",
            slug="free-stopped-coach-sec",
            category=self.category,
            short_description="Paused free asset",
            price=Decimal("0.00"),
            is_free=True,
            is_published=True,
            external_download_url="https://secret-cdn.example.com/free-coach.zip",
            distribution_stopped=True,
            distribution_stop_downloads=True,
        )

    def test_public_asset_endpoints_do_not_expose_download_sources(self):
        sensitive_keys = (
            "google_drive_file_id",
            "external_download_url",
            "private_download_key",
            "download_file",
        )
        sensitive_values = (
            "1iE36rJYt1xM-gZDmf_NKu2TrChwpff4G",
            "secret-cdn.example.com",
            "private-releases/vb-sleeper-orange.zip",
        )

        # Unauthenticated list & detail
        list_res = self.client.get("/api/assets/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        list_dump = json.dumps(list_res.data)
        for val in sensitive_values:
            self.assertNotIn(val, list_dump)

        detail_res = self.client.get(f"/api/assets/{self.paid_asset.slug}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertTrue(detail_res.data["has_file"])
        for key in sensitive_keys:
            self.assertNotIn(key, detail_res.data)
        detail_dump = json.dumps(detail_res.data)
        for val in sensitive_values:
            self.assertNotIn(val, detail_dump)

        # Authenticated unpaid visitor also cannot inspect raw download sources on detail endpoint
        self.client.force_authenticate(user=self.other_user)
        auth_detail_res = self.client.get(f"/api/assets/{self.paid_asset.slug}/")
        self.assertEqual(auth_detail_res.status_code, status.HTTP_200_OK)
        for key in sensitive_keys:
            self.assertNotIn(key, auth_detail_res.data)
        auth_detail_dump = json.dumps(auth_detail_res.data)
        for val in sensitive_values:
            self.assertNotIn(val, auth_detail_dump)

    def test_public_reviews_strip_reviewer_pii(self):
        res = self.client.get(f"/api/assets/{self.paid_asset.slug}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        reviews = res.data["reviews"]
        self.assertEqual(len(reviews), 1)
        reviewer = reviews[0]["user"]
        self.assertEqual(reviewer["username"], "paid_buyer")
        for private_key in ("email", "phone_number", "first_name", "last_name", "is_staff", "paid_orders_count", "special_access"):
            self.assertNotIn(private_key, reviewer)
        raw_dump = json.dumps(res.data)
        self.assertNotIn("buyer@secretmail.com", raw_dump)
        self.assertNotIn("9876501234", raw_dump)

    def test_download_endpoints_enforce_auth_and_purchase(self):
        # Unauthenticated
        self.assertEqual(self.client.post(f"/api/assets/{self.paid_asset.id}/download/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(f"/api/assets/{self.paid_asset.slug}/download/").status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated non-buyer
        self.client.force_authenticate(user=self.other_user)
        non_buyer_res = self.client.post(f"/api/assets/{self.paid_asset.id}/download/")
        self.assertEqual(non_buyer_res.status_code, status.HTTP_403_FORBIDDEN)

        # Verified buyer gets presigned URL via authenticated download endpoint
        self.client.force_authenticate(user=self.buyer)
        with patch("store.views.create_private_download_url", return_value="https://r2.signed.example.com/vb.zip?sig=abc"):
            buyer_res = self.client.post(f"/api/assets/{self.paid_asset.id}/download/")
        self.assertEqual(buyer_res.status_code, status.HTTP_200_OK)
        self.assertEqual(buyer_res.data["download_url"], "https://r2.signed.example.com/vb.zip?sig=abc")

    def test_admin_asset_endpoint_retains_download_fields_for_staff_only(self):
        # Anonymous & non-staff rejected
        self.assertEqual(self.client.get(f"/api/admin/assets/{self.paid_asset.id}/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(user=self.other_user)
        self.assertEqual(self.client.get(f"/api/admin/assets/{self.paid_asset.id}/").status_code, status.HTTP_403_FORBIDDEN)

        # Staff retains editable download source fields
        self.client.force_authenticate(user=self.staff)
        res = self.client.get(f"/api/admin/assets/{self.paid_asset.id}/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["google_drive_file_id"], "1iE36rJYt1xM-gZDmf_NKu2TrChwpff4G")
        self.assertEqual(res.data["external_download_url"], "https://secret-cdn.example.com/vb-sleeper.zip")
        self.assertEqual(res.data["private_download_key"], "private-releases/vb-sleeper-orange.zip")

    def test_site_settings_hides_bypass_token_from_non_staff(self):
        setting = SiteSetting.load()
        setting.maintenance_bypass_token = "top-secret-bypass-123"
        setting.save()

        public_res = self.client.get("/api/site-settings/")
        self.assertEqual(public_res.status_code, status.HTTP_200_OK)
        self.assertNotIn("maintenance_bypass_token", public_res.data)
        self.assertNotIn("top-secret-bypass-123", json.dumps(public_res.data))

        self.client.force_authenticate(user=self.staff)
        admin_res = self.client.get("/api/admin/settings/")
        self.assertEqual(admin_res.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_res.data["site"]["maintenance_bypass_token"], "top-secret-bypass-123")

    def test_wishlist_download_enabled_respects_distribution_stopped_and_approved_orders(self):
        Wishlist.objects.create(user=self.other_user, asset=self.free_stopped_asset)
        approved_asset = Asset.objects.create(
            title="Manual Approved Release",
            slug="manual-approved-sec",
            category=self.category,
            short_description="Approved UPI purchase",
            price=Decimal("199.00"),
            is_published=True,
            external_download_url="https://secret-cdn.example.com/manual.zip",
        )
        Order.objects.create(
            user=self.other_user,
            asset=approved_asset,
            amount=Decimal("199.00"),
            status=Order.Status.APPROVED,
            download_enabled=True,
        )
        Wishlist.objects.create(user=self.other_user, asset=approved_asset)

        self.client.force_authenticate(user=self.other_user)
        res = self.client.get("/api/wishlist/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        by_slug = {item["asset"]["slug"]: item["download_enabled"] for item in res.data}
        self.assertFalse(by_slug["free-stopped-coach-sec"])
        self.assertTrue(by_slug["manual-approved-sec"])
