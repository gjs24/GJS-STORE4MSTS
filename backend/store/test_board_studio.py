from decimal import Decimal
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from store.models import BoardTemplate, Order, UserBoardUnlock, UserCustomBoard


class BoardStudioTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_user", email="admin@example.com", password="password123"
        )
        self.user1 = User.objects.create_user(
            username="gamer1", email="gamer1@example.com", password="password123"
        )
        self.user2 = User.objects.create_user(
            username="gamer2", email="gamer2@example.com", password="password123"
        )

        self.free_template = BoardTemplate.objects.create(
            id="test-free-board",
            name="Test Free LED Board",
            category="LED_MATRIX",
            is_paid=False,
            price=Decimal("0.00"),
            published=True,
            fields=[
                {
                    "id": "train_no",
                    "label": "Train No",
                    "default_text": "12637",
                    "x": 50,
                    "y": 50,
                    "width": 200,
                    "height": 50,
                }
            ],
        )

        self.paid_template = BoardTemplate.objects.create(
            id="test-paid-board",
            name="Test Paid LED Board",
            category="LED_MATRIX",
            is_paid=True,
            price=Decimal("49.00"),
            published=True,
            fields=[
                {
                    "id": "train_no",
                    "label": "Train No",
                    "default_text": "20607",
                    "x": 50,
                    "y": 50,
                    "width": 200,
                    "height": 50,
                }
            ],
        )

    def test_can_user_customize_logic(self):
        # Free template is customizable by anyone
        self.assertTrue(self.free_template.can_user_customize(self.user1))
        # Paid template is not customizable by regular user before unlock
        self.assertFalse(self.paid_template.can_user_customize(self.user1))
        # Staff can customize paid template
        self.assertTrue(self.paid_template.can_user_customize(self.admin))

        # After unlock, user can customize
        UserBoardUnlock.objects.create(user=self.user1, template=self.paid_template)
        self.assertTrue(self.paid_template.can_user_customize(self.user1))
        # Other user remains locked
        self.assertFalse(self.paid_template.can_user_customize(self.user2))

    def test_list_board_templates(self):
        url = reverse("board-template-list")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in res.data]
        self.assertIn("test-free-board", ids)
        self.assertIn("test-paid-board", ids)

    def test_save_custom_board_free_template(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("custom-board-list")
        payload = {
            "template": self.free_template.id,
            "title": "My Superfast Board",
            "custom_field_values": {"train_no": "12638"},
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserCustomBoard.objects.filter(user=self.user1).count(), 1)

    def test_save_custom_board_locked_paid_template_denied(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("custom-board-list")
        payload = {
            "template": self.paid_template.id,
            "title": "Unauthorized Board",
            "custom_field_values": {"train_no": "99999"},
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_save_custom_board_after_unlock_succeeds(self):
        UserBoardUnlock.objects.create(user=self.user1, template=self.paid_template)
        self.client.force_authenticate(user=self.user1)
        url = reverse("custom-board-list")
        payload = {
            "template": self.paid_template.id,
            "title": "Unlocked Vande Bharat Board",
            "custom_field_values": {"train_no": "20607"},
        }
        res = self.client.post(url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_free_template_checkout_auto_unlocks(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("cashfree-create-order")
        res = self.client.post(url, {"board_template_id": self.free_template.id}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(UserBoardUnlock.objects.filter(user=self.user1, template=self.free_template).exists())

    def test_purchase_list_includes_board_template_order(self):
        self.client.force_authenticate(user=self.user1)
        order = Order.objects.create(
            user=self.user1,
            board_template=self.paid_template,
            amount=Decimal("49.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
            provider_order_id="GJS-B99999",
        )
        url = reverse("purchases")
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)
        found = next((item for item in res.data if item["id"] == order.id), None)
        self.assertIsNotNone(found)
        self.assertIsNone(found["asset"])
        self.assertIsNotNone(found["board_template"])
        self.assertEqual(found["board_template"]["id"], self.paid_template.id)
        self.assertEqual(found["board_template"]["name"], self.paid_template.name)
        self.assertTrue(found["download_enabled"])

    def test_paid_template_checkout_creates_order_without_crash(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("order-create")
        res = self.client.post(url, {"board_template_id": self.paid_template.id}, format="json")
        self.assertNotEqual(res.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn(res.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE])
        order = Order.objects.filter(user=self.user1, board_template=self.paid_template).first()
        self.assertIsNotNone(order)
        self.assertEqual(order.amount, self.paid_template.price)
        self.assertIsNone(order.asset)

    def test_board_template_invoice_generation(self):
        from store.invoice import generate_invoice_pdf, generate_invoice_html
        order = Order.objects.create(
            user=self.user1,
            board_template=self.paid_template,
            amount=Decimal("49.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
            provider_order_id="GJS-B12345",
        )
        pdf_bytes = generate_invoice_pdf(order)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 100)

        html_str = generate_invoice_html(order)
        self.assertIn(self.paid_template.name, html_str)
        self.assertIn("LED Name Board", html_str)

    def test_asset_with_free_bundled_board_template_unlocks_for_user(self):
        from store.models import Asset, Category
        cat = Category.objects.create(name="Trains", slug="trains")
        asset = Asset.objects.create(
            title="Vande Bharat Trainset",
            slug="vande-bharat-trainset",
            category=cat,
            price=Decimal("299.00"),
            is_published=True,
            board_template=self.paid_template,
            bundle_board_template_free=True,
        )
        self.assertFalse(self.paid_template.can_user_customize(self.user1))

        # User purchases asset
        from store.views import grant_board_unlock_if_applicable
        order = Order.objects.create(
            user=self.user1,
            asset=asset,
            amount=Decimal("299.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
            provider_order_id="GJS-000123",
        )
        grant_board_unlock_if_applicable(order)

        self.assertTrue(self.paid_template.can_user_customize(self.user1))
        self.assertTrue(UserBoardUnlock.objects.filter(user=self.user1, template=self.paid_template).exists())

    def test_asset_without_free_bundle_keeps_template_locked(self):
        from store.models import Asset, Category
        cat = Category.objects.create(name="Locos", slug="locos")
        asset = Asset.objects.create(
            title="WAP7 Locomotive",
            slug="wap7-locomotive",
            category=cat,
            price=Decimal("199.00"),
            is_published=True,
            board_template=self.paid_template,
            bundle_board_template_free=False,
        )
        self.assertFalse(self.paid_template.can_user_customize(self.user2))

        # User2 purchases asset without free bundle
        from store.views import grant_board_unlock_if_applicable
        order = Order.objects.create(
            user=self.user2,
            asset=asset,
            amount=Decimal("199.00"),
            currency="INR",
            status=Order.Status.PAID,
            download_enabled=True,
            provider_order_id="GJS-000124",
        )
        grant_board_unlock_if_applicable(order)

        # Template remains locked so user must buy it separately
        self.assertFalse(self.paid_template.can_user_customize(self.user2))
        self.assertFalse(UserBoardUnlock.objects.filter(user=self.user2, template=self.paid_template).exists())

