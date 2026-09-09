from decimal import Decimal
from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status

from store.models import Asset, Category, Order
from store.serializers import AssetListSerializer, AssetDetailSerializer, AssetWriteSerializer
from store.views import OrderCreateView, create_download_response
from store.early_access import calculate_early_access_status


@override_settings(MANUAL_UPI_ID="admin@upi", CASHFREE_CLIENT_ID="", CASHFREE_CLIENT_SECRET="")
class EarlyAccessTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.category = Category.objects.create(name="Locomotives", slug="locomotives")
        self.user_eligible = User.objects.create_user(username="customer_eligible", password="password123", email="eligible@test.com")
        self.user_ineligible = User.objects.create_user(username="customer_ineligible", password="password123", email="ineligible@test.com")

        # Product 1 (already released and purchased by user_eligible)
        self.product1 = Asset.objects.create(
            title="Product 1",
            slug="product-1",
            category=self.category,
            short_description="Base locomotive pack",
            description="Detailed product 1 description",
            price=Decimal("100.00"),
            original_price=Decimal("100.00"),
            is_upcoming=False,
            is_published=True,
        )
        Order.objects.create(
            user=self.user_eligible,
            asset=self.product1,
            amount=Decimal("100.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
        )

        # Product 2 (upcoming product)
        self.product2 = Asset.objects.create(
            title="Upcoming Product 2",
            slug="upcoming-product-2",
            category=self.category,
            short_description="Next gen train pack",
            description="Detailed product 2 description",
            price=Decimal("500.00"),
            original_price=Decimal("500.00"),
            is_upcoming=True,
            is_published=True,
            early_access_enabled=True,
            early_access_has_access=True,
            early_access_has_discount=True,
            early_access_discount_percent=20,  # 20% off = 400.00
            early_access_badge="VIP Early Access",
        )
        self.product2.early_access_required_assets.add(self.product1)

    def test_serializer_for_eligible_user(self):
        req = self.factory.get(f"/api/assets/{self.product2.slug}/")
        force_authenticate(req, user=self.user_eligible)
        drf_req = Request(req)
        serializer = AssetDetailSerializer(self.product2, context={"request": drf_req})
        data = serializer.data

        self.assertTrue(data["early_access_enabled"])
        self.assertTrue(data["user_is_eligible"])
        self.assertTrue(data["user_can_access_early"])
        self.assertTrue(data["user_has_early_discount"])
        self.assertEqual(data["user_effective_price"], "400.00")
        self.assertEqual(data["user_discount_percent"], 20)
        self.assertIn("Product 1", data["early_access_required_asset_titles"])

    def test_serializer_for_ineligible_user(self):
        req = self.factory.get(f"/api/assets/{self.product2.slug}/")
        force_authenticate(req, user=self.user_ineligible)
        drf_req = Request(req)
        serializer = AssetDetailSerializer(self.product2, context={"request": drf_req})
        data = serializer.data

        self.assertTrue(data["early_access_enabled"])
        self.assertFalse(data["user_is_eligible"])
        self.assertFalse(data["user_can_access_early"])
        self.assertFalse(data["user_has_early_discount"])
        self.assertEqual(data["user_effective_price"], "500.00")
        self.assertEqual(data["user_discount_percent"], 0)

    def test_both_early_access_and_discount(self):
        # Eligible user creates order for upcoming product 2 with discount applied
        view = OrderCreateView.as_view()
        req = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req, user=self.user_eligible)
        response = view(req)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response.data["amount"])), Decimal("400.00"))

        # Ineligible user is blocked because asset is upcoming
        req2 = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req2, user=self.user_ineligible)
        response2 = view(req2)
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_only_early_access_no_discount(self):
        # Switch product 2 to early access ONLY (no discount)
        self.product2.early_access_has_access = True
        self.product2.early_access_has_discount = False
        self.product2.save()

        view = OrderCreateView.as_view()
        req = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req, user=self.user_eligible)
        response = view(req)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Standard price 500.00 is charged (no discount)
        self.assertEqual(Decimal(str(response.data["amount"])), Decimal("500.00"))

    def test_only_discount_no_early_access(self):
        # Switch product 2 to discount ONLY (no early access)
        self.product2.early_access_has_access = False
        self.product2.early_access_has_discount = True
        self.product2.save()

        view = OrderCreateView.as_view()
        # Even eligible user cannot buy yet because it's upcoming and no early access is granted
        req = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req, user=self.user_eligible)
        response = view(req)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Once released (is_upcoming = False), eligible user gets the discount
        self.product2.is_upcoming = False
        self.product2.save()

        req_released = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req_released, user=self.user_eligible)
        response_released = view(req_released)
        self.assertEqual(response_released.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response_released.data["amount"])), Decimal("400.00"))

    def test_feature_disabled(self):
        # Disable early access feature entirely
        self.product2.early_access_enabled = False
        self.product2.save()

        view = OrderCreateView.as_view()
        req = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req, user=self.user_eligible)
        response = view(req)
        # Blocked as standard upcoming product
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_asset_write_serializer_m2m(self):
        # Verify writing required assets via list of integers
        serializer = AssetWriteSerializer(instance=self.product2, data={
            "title": "Upcoming Product 2",
            "category": self.category.id,
            "short_description": "Short",
            "description": "Long",
            "file_size": "100MB",
            "early_access_enabled": True,
            "early_access_has_access": True,
            "early_access_has_discount": True,
            "early_access_discount_percent": 25,
            "early_access_required_assets": [self.product1.id],
        }, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated = serializer.save()
        self.assertEqual(list(updated.early_access_required_assets.all()), [self.product1])

    def test_early_access_download(self):
        # Set external download url for test
        self.product2.external_download_url = "https://example.com/download.zip"
        self.product2.save()

        # Ineligible user: blocked
        req_ineligible = self.factory.get(f"/api/assets/{self.product2.slug}/download/")
        req_ineligible.user = self.user_ineligible
        resp_ineligible = create_download_response(req_ineligible, self.product2)
        self.assertEqual(resp_ineligible.status_code, status.HTTP_403_FORBIDDEN)

        # Eligible user before purchase: blocked by purchase requirement
        req_eligible = self.factory.get(f"/api/assets/{self.product2.slug}/download/")
        req_eligible.user = self.user_eligible
        resp_eligible_unpaid = create_download_response(req_eligible, self.product2)
        self.assertEqual(resp_eligible_unpaid.status_code, status.HTTP_403_FORBIDDEN)

        # Eligible user creates and pays early access order
        Order.objects.create(
            user=self.user_eligible,
            asset=self.product2,
            amount=Decimal("400.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
        )
        req_eligible_paid = self.factory.get(f"/api/assets/{self.product2.slug}/download/")
        req_eligible_paid.user = self.user_eligible
        resp_eligible_paid = create_download_response(req_eligible_paid, self.product2)
        self.assertEqual(resp_eligible_paid.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_eligible_paid.data["download_url"], "https://example.com/download.zip")

    def test_early_access_scheduled_future(self):
        import datetime
        from django.utils import timezone

        # Set VIP early access start time to future
        self.product2.early_access_starts_at = timezone.now() + datetime.timedelta(days=2)
        self.product2.save()

        status_result = calculate_early_access_status(self.product2, self.user_eligible)
        self.assertTrue(status_result["is_eligible"])
        self.assertFalse(status_result["can_access_early"])
        self.assertTrue(status_result["is_early_access_pending"])
        self.assertFalse(status_result["is_early_access_active"])

        # Attempt to create order should be blocked
        view = OrderCreateView.as_view()
        req = self.factory.post("/api/orders/create/", {"asset_id": self.product2.id}, format="json")
        force_authenticate(req, user=self.user_eligible)
        response = view(req)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_early_access_scheduled_active(self):
        import datetime
        from django.utils import timezone

        # Set VIP early access start time to past (active)
        self.product2.early_access_starts_at = timezone.now() - datetime.timedelta(hours=2)
        self.product2.early_access_ends_at = timezone.now() + datetime.timedelta(days=5)
        self.product2.save()

        status_result = calculate_early_access_status(self.product2, self.user_eligible)
        self.assertTrue(status_result["is_eligible"])
        self.assertTrue(status_result["can_access_early"])
        self.assertFalse(status_result["is_early_access_pending"])
        self.assertTrue(status_result["is_early_access_active"])

