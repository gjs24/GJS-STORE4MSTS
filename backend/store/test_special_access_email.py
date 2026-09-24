from unittest.mock import patch
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from store.models import Asset, Category, SiteSetting, UserSpecialAccess
from store.views import send_special_access_email


class SpecialAccessEmailTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_vip", email="admin@example.com", password="password123"
        )
        self.vip_user = User.objects.create_user(
            username="train_master", email="trainmaster@example.com", password="password123"
        )
        self.no_email_user = User.objects.create_user(
            username="silent_user", email="", password="password123"
        )
        self.category = Category.objects.create(name="Trains", slug="trains")
        self.asset = Asset.objects.create(
            title="Vande Bharat Express",
            slug="vande-bharat-express",
            price=99,
            category=self.category,
            is_published=True,
        )

    def test_site_setting_email_defaults(self):
        """Verify SiteSetting loads default special access email template fields."""
        setting = SiteSetting.load()
        self.assertIn("VIP", setting.special_access_email_subject)
        self.assertIn("Special Access", setting.special_access_email_heading)
        self.assertIn("Special Access", setting.special_access_email_body)
        self.assertTrue(setting.special_access_email_footer)

    @patch("store.views.send_email_message")
    def test_send_special_access_email_placeholders(self, mock_send_email):
        """Verify dynamic placeholders are correctly replaced in email body and subject."""
        mock_send_email.return_value = (True, "")

        special_access, _ = UserSpecialAccess.objects.get_or_create(
            user=self.vip_user,
            defaults={"is_all_access_free": True},
        )
        special_access.is_all_access_free = True
        special_access.save()

        sent, err = send_special_access_email(self.vip_user, special_access)
        self.assertTrue(sent)
        self.assertEqual(err, "")
        mock_send_email.assert_called_once()

        call_args = mock_send_email.call_args[0]
        recipient_email, subject, html_content, text_content = call_args

        self.assertEqual(recipient_email, "trainmaster@example.com")
        self.assertIn("train_master", html_content)
        self.assertIn("Storewide All-Access Pass", html_content)
        self.assertIn("Permanent Access", html_content)

    @patch("store.views.send_email_message")
    def test_admin_update_special_access_with_email_notification(self, mock_send_email):
        """Verify admin special access PATCH sends announcement email when toggled on."""
        mock_send_email.return_value = (True, "")
        self.client.force_authenticate(user=self.admin)

        payload = {
            "is_all_access_free": True,
            "admin_note": "Special test pass",
            "send_email_notification": True,
            "custom_email_subject": "Welcome to MSTS VIP {username}!",
            "custom_email_body": "Hello {username}, enjoy free access to {access_type}!",
        }
        res = self.client.patch(f"/api/admin/users/{self.vip_user.id}/special-access/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["is_all_access_free"])
        self.assertIn("email_status", res.data)
        self.assertTrue(res.data["email_status"]["sent"])
        self.assertEqual(res.data["email_status"]["recipient"], "trainmaster@example.com")

        mock_send_email.assert_called_once()
        sent_subject = mock_send_email.call_args[0][1]
        self.assertEqual(sent_subject, "Welcome to MSTS VIP train_master!")

    @patch("store.views.send_email_message")
    def test_admin_send_special_access_email_action(self, mock_send_email):
        """Verify admin can manually trigger sending announcement email to an active special access user."""
        mock_send_email.return_value = (True, "")
        self.client.force_authenticate(user=self.admin)

        UserSpecialAccess.objects.create(user=self.vip_user, is_all_access_free=True)

        res = self.client.post(
            f"/api/admin/users/{self.vip_user.id}/send-special-access-email/",
            {"custom_subject": "Manual Announcement for {username}"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get("success"))
        mock_send_email.assert_called_once()

    def test_special_access_email_fails_cleanly_without_email(self):
        """Verify graceful error when user has no email address configured."""
        self.client.force_authenticate(user=self.admin)
        UserSpecialAccess.objects.create(user=self.no_email_user, is_all_access_free=True)

        res = self.client.post(f"/api/admin/users/{self.no_email_user.id}/send-special-access-email/", format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not have an email address", res.data["detail"])
