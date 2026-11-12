import base64
import hashlib
import hmac
import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from store.models import (
    Asset,
    AssetFeatureAddon,
    BoardTemplate,
    Category,
    EmailOTP,
    Order,
    Payment,
    Review,
    SiteSetting,
    SpecialAccessInviteLink,
    UserAssetAddonUnlock,
    UserCustomBoard,
    Wishlist,
)
from store.views import cashfree_return_url


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


class HighLevelSecurityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.category = Category.objects.create(name="Coaches", slug="coaches-sec")
        self.staff = User.objects.create_user(
            username="sec_admin",
            email="secadmin@gjspro.store",
            password="StrongAdminPassword123!",
            is_staff=True,
        )
        self.user = User.objects.create_user(
            username="sec_user",
            email="secuser@example.com",
            password="StrongUserPassword123!",
        )
        self.attacker = User.objects.create_user(
            username="sec_attacker",
            email="attacker@example.com",
            password="StrongAttackerPassword123!",
        )
        self.asset = Asset.objects.create(
            title="Sec Test Trainset",
            slug="sec-test-trainset",
            category=self.category,
            short_description="Test asset",
            price=Decimal("299.00"),
            original_price=Decimal("399.00"),
            is_published=True,
            external_download_url="https://secret.example.com/trainset.zip",
        )

    def tearDown(self):
        cache.clear()

    @override_settings(RAZORPAY_WEBHOOK_SECRET="rzp_wh_secret_abc", RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_razorpay_webhook_requires_valid_hmac_amount_and_blocks_tampering(self):
        order = Order.objects.create(
            user=self.attacker,
            asset=self.asset,
            amount=Decimal("299.00"),
            currency="INR",
            status=Order.Status.PENDING,
            provider_order_id="order_rzp_sec_1",
        )
        payload = {
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": "order_rzp_sec_1"}},
                "payment": {"entity": {"id": "pay_rzp_1", "order_id": "order_rzp_sec_1", "amount": 29900, "currency": "INR"}},
            },
        }
        raw = json.dumps(payload).encode("utf-8")

        # Missing signature MUST fail (previously bypassed!)
        res_unsigned = self.client.post("/api/payments/razorpay-webhook/", data=raw, content_type="application/json")
        self.assertEqual(res_unsigned.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertFalse(order.download_enabled)

        # Invalid signature MUST fail
        res_bad = self.client.post(
            "/api/payments/razorpay-webhook/",
            data=raw,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="deadbeef",
        )
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Underpaid amount even with valid HMAC MUST fail
        underpaid = {
            "event": "payment.captured",
            "payload": {
                "order": {"entity": {"id": "order_rzp_sec_1"}},
                "payment": {"entity": {"id": "pay_rzp_under", "order_id": "order_rzp_sec_1", "amount": 100, "currency": "INR"}},
            },
        }
        raw_under = json.dumps(underpaid).encode("utf-8")
        sig_under = hmac.new(b"rzp_wh_secret_abc", raw_under, hashlib.sha256).hexdigest()
        res_under = self.client.post(
            "/api/payments/razorpay-webhook/",
            data=raw_under,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=sig_under,
        )
        self.assertEqual(res_under.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)

        # Valid HMAC and full matching amount succeeds
        valid_sig = hmac.new(b"rzp_wh_secret_abc", raw, hashlib.sha256).hexdigest()
        res_ok = self.client.post(
            "/api/payments/razorpay-webhook/",
            data=raw,
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE=valid_sig,
        )
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PAID)
        self.assertTrue(order.download_enabled)

    @override_settings(RAZORPAY_WEBHOOK_SECRET="", RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_razorpay_webhook_unconfigured_rejects_unverified_payload(self):
        order = Order.objects.create(
            user=self.attacker,
            asset=self.asset,
            amount=Decimal("299.00"),
            currency="INR",
            status=Order.Status.PENDING,
            provider_order_id="order_rzp_unconf",
        )
        res = self.client.post(
            "/api/payments/razorpay-webhook/",
            data={"event": "payment.captured", "payload": {"order": {"entity": {"id": "order_rzp_unconf"}}}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)

    @override_settings(RAZORPAY_KEY_ID="rzp_test", RAZORPAY_KEY_SECRET="rzp_secret")
    def test_payment_verify_blocks_mismatched_order_amount_and_payment_replay(self):
        attacker_order = Order.objects.create(
            user=self.attacker,
            asset=self.asset,
            amount=Decimal("299.00"),
            currency="INR",
            status=Order.Status.PENDING,
            provider_order_id="order_target_299",
        )
        other_order = Order.objects.create(
            user=self.user,
            asset=self.asset,
            amount=Decimal("10.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
            provider_order_id="order_cheap_10",
        )
        Payment.objects.create(
            order=other_order,
            provider=Payment.Provider.RAZORPAY,
            provider_payment_id="pay_already_used",
            status="paid",
        )

        self.client.force_authenticate(user=self.attacker)

        # Replay of an already used Razorpay payment ID fails
        replay_res = self.client.post(
            "/api/payments/verify/",
            {
                "order_id": str(attacker_order.id),
                "razorpay_order_id": "order_target_299",
                "razorpay_payment_id": "pay_already_used",
                "razorpay_signature": "forged",
            },
            format="json",
        )
        self.assertEqual(replay_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Captured Razorpay payment belonging to ANOTHER order_id or lower amount fails
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "id": "pay_cheap_1rs",
            "status": "captured",
            "order_id": "order_other_123",
            "amount": 100,
            "currency": "INR",
        }
        with patch("store.views.requests.get", return_value=mock_resp):
            spoof_res = self.client.post(
                "/api/payments/verify/",
                {
                    "order_id": str(attacker_order.id),
                    "razorpay_order_id": "order_target_299",
                    "razorpay_payment_id": "pay_cheap_1rs",
                    "razorpay_signature": "forged",
                },
                format="json",
            )
        self.assertEqual(spoof_res.status_code, status.HTTP_400_BAD_REQUEST)
        attacker_order.refresh_from_db()
        self.assertEqual(attacker_order.status, Order.Status.PENDING)

        # Blocked order cannot be verified
        attacker_order.status = Order.Status.BLOCKED
        attacker_order.save(update_fields=["status"])
        blocked_res = self.client.post(
            "/api/payments/verify/",
            {"order_id": str(attacker_order.id), "utr": "123456789012"},
            format="json",
        )
        self.assertEqual(blocked_res.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(CASHFREE_CLIENT_ID="cf_id", CASHFREE_CLIENT_SECRET="cf_secret_key")
    def test_cashfree_webhook_enforces_signature(self):
        body = json.dumps({"data": {"order": {"order_id": "GJS-999999"}}}).encode("utf-8")
        res_unsigned = self.client.post("/api/payments/cashfree-webhook/", data=body, content_type="application/json")
        self.assertEqual(res_unsigned.status_code, status.HTTP_400_BAD_REQUEST)

        ts = "1700000000"
        sig = base64.b64encode(hmac.new(b"cf_secret_key", ts.encode("utf-8") + body, hashlib.sha256).digest()).decode("utf-8")
        res_signed = self.client.post(
            "/api/payments/cashfree-webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_WEBHOOK_TIMESTAMP=ts,
            HTTP_X_WEBHOOK_SIGNATURE=sig,
        )
        self.assertEqual(res_signed.status_code, status.HTTP_200_OK)

    def test_cashfree_return_url_blocks_open_redirects(self):
        order = Order.objects.create(user=self.user, asset=self.asset, amount=Decimal("299.00"))
        evil_req = MagicMock()
        evil_req.data = {"return_url": "https://evil-phishing.example.com/steal"}
        evil_req.META = {}
        evil_req.get_host.return_value = "gjspro.store"
        self.assertNotIn("evil-phishing", cashfree_return_url(order, evil_req))

        proto_rel_req = MagicMock()
        proto_rel_req.data = {"return_url": "//evil-phishing.example.com/steal"}
        proto_rel_req.META = {}
        proto_rel_req.get_host.return_value = "gjspro.store"
        self.assertNotIn("evil-phishing", cashfree_return_url(order, proto_rel_req))

        good_req = MagicMock()
        good_req.data = {"return_url": "https://gjspro.store/dashboard/purchases"}
        good_req.META = {}
        good_req.get_host.return_value = "gjspro.store"
        self.assertTrue(cashfree_return_url(order, good_req).startswith("https://gjspro.store/dashboard/purchases"))

    def test_custom_board_patch_cannot_swap_to_paid_template_or_javascript_url(self):
        free_tpl = BoardTemplate.objects.create(
            id="sec-free-tpl",
            name="Sec Free Board",
            is_paid=False,
            price=Decimal("0.00"),
            published=True,
            fields=[],
        )
        paid_tpl = BoardTemplate.objects.create(
            id="sec-paid-tpl",
            name="Sec Paid Board",
            is_paid=True,
            price=Decimal("99.00"),
            published=True,
            fields=[],
        )
        board = UserCustomBoard.objects.create(user=self.attacker, template=free_tpl, title="My Free Board")

        self.client.force_authenticate(user=self.attacker)
        swap_res = self.client.patch(
            f"/api/custom-boards/{board.id}/",
            {"template": paid_tpl.id},
            format="json",
        )
        self.assertEqual(swap_res.status_code, status.HTTP_403_FORBIDDEN)
        board.refresh_from_db()
        self.assertEqual(board.template_id, free_tpl.id)

        xss_res = self.client.patch(
            f"/api/custom-boards/{board.id}/",
            {"preview_image_url": "javascript:alert(1)"},
            format="json",
        )
        self.assertEqual(xss_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disabled_user_otp_login_blocked_and_otp_brute_force_locked(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        EmailOTP.objects.create(
            email=self.user.email,
            otp_code="112233",
            purpose="login",
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        disabled_res = self.client.post(
            "/api/auth/verify-otp/",
            {"email": self.user.email, "otp": "112233", "purpose": "login"},
            format="json",
        )
        self.assertEqual(disabled_res.status_code, status.HTTP_403_FORBIDDEN)

        # Reactivate & test 5 failed attempts permanently invalidates the OTP
        self.user.is_active = True
        self.user.save(update_fields=["is_active"])
        otp = EmailOTP.objects.create(
            email=self.user.email,
            otp_code="654321",
            purpose="login",
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        for _ in range(5):
            r = self.client.post(
                "/api/auth/verify-otp/",
                {"email": self.user.email, "otp": "000000", "purpose": "login"},
                format="json",
            )
            self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)
        late_res = self.client.post(
            "/api/auth/verify-otp/",
            {"email": self.user.email, "otp": "654321", "purpose": "login"},
            format="json",
        )
        self.assertEqual(late_res.status_code, status.HTTP_400_BAD_REQUEST)

        # Duplicate email signup rejected
        dup_res = self.client.post(
            "/api/auth/register/",
            {"username": "another_sec_user", "email": self.user.email.upper(), "password": "VeryStrongPassword987!"},
            format="json",
        )
        self.assertEqual(dup_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_current_user_get_does_not_mutate_phone_and_maintenance_bypass_constant_time(self):
        self.user.profile.phone_number = "9000000001"
        self.user.profile.save()
        self.client.force_authenticate(user=self.user)

        res = self.client.get("/api/auth/me/?phone_number=1112223334")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.phone_number, "9000000001")

        setting = SiteSetting.load()
        setting.maintenance_bypass_token = "bypass-token-999"
        setting.save()
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.post("/api/verify-maintenance-bypass/", {"token": "wrong"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post("/api/verify-maintenance-bypass/", {"token": "bypass-token-999"}, format="json").status_code,
            status.HTTP_200_OK,
        )

    def test_addon_download_blocks_blocked_order_and_rejects_svg_upload(self):
        addon = AssetFeatureAddon.objects.create(
            asset=self.asset,
            title="Sound Upgrade",
            upgrade_price=Decimal("49.00"),
            external_download_url="https://secret.example.com/addon.zip",
            is_active=True,
        )
        UserAssetAddonUnlock.objects.create(user=self.attacker, addon=addon)
        Order.objects.create(
            user=self.attacker,
            asset=self.asset,
            amount=Decimal("299.00"),
            status=Order.Status.BLOCKED,
            block_reason="Chargeback abuse",
        )

        self.client.force_authenticate(user=self.attacker)
        dl_res = self.client.post(f"/api/addons/{addon.id}/download/")
        self.assertEqual(dl_res.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.staff)
        svg_file = SimpleUploadedFile("xss.svg", b"<svg onload=alert(1)></svg>", content_type="image/svg+xml")
        upload_res = self.client.post("/api/board-templates/upload-image/", {"image": svg_file}, format="multipart")
        self.assertEqual(upload_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_single_use_special_access_link_claim_atomic_limit(self):
        link = SpecialAccessInviteLink.objects.create(
            token="vip-one-use-sec",
            title="Single Use VIP",
            mode=SpecialAccessInviteLink.Mode.AUTO_GRANT,
            is_all_access_free=True,
            max_uses=1,
            is_active=True,
        )

        self.client.force_authenticate(user=self.user)
        first_res = self.client.post(f"/api/special-access/link/{link.token}/claim/", {}, format="json")
        self.assertEqual(first_res.status_code, status.HTTP_200_OK)
        self.assertEqual(first_res.data["status"], "APPROVED")

        self.client.force_authenticate(user=self.attacker)
        second_res = self.client.post(f"/api/special-access/link/{link.token}/claim/", {}, format="json")
        self.assertEqual(second_res.status_code, status.HTTP_400_BAD_REQUEST)
