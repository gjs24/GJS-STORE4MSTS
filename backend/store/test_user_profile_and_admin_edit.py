from decimal import Decimal
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from store.models import EmailOTP, Order, UserProfile


class UserProfileAndAdminEditTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username="admin_boss", email="boss@example.com", password="password123"
        )
        self.user = User.objects.create_user(
            username="regular_joe", email="joe@example.com", password="password123"
        )

    def test_user_profile_auto_created(self):
        """Verify UserProfile is automatically created via post_save signal."""
        profile = UserProfile.objects.filter(user=self.user).first()
        self.assertIsNotNone(profile)
        self.assertEqual(profile.phone_number, "")

    def test_registration_with_phone_number(self):
        """Verify /api/auth/register/ accepts and stores phone_number in UserProfile."""
        data = {
            "username": "newuser99",
            "email": "newuser99@example.com",
            "password": "strongPassword123!",
            "phone_number": "9876543210",
            "first_name": "New",
            "last_name": "User",
        }
        res = self.client.post("/api/auth/register/", data)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(username="newuser99")
        self.assertTrue(hasattr(new_user, "profile"))
        self.assertEqual(new_user.profile.phone_number, "9876543210")

    def test_verify_otp_signup_with_phone_number(self):
        """Verify /api/auth/verify-otp/ with purpose='signup' creates user and stores phone_number."""
        # Create an unexpired OTP
        EmailOTP.objects.create(
            email="otptest@example.com",
            otp_code="123456",
            purpose="signup",
            expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )

        data = {
            "email": "otptest@example.com",
            "otp": "123456",
            "purpose": "signup",
            "username": "otp_registered_user",
            "password": "validPassword123!",
            "phone_number": "+91 91234 56789",
        }
        res = self.client.post("/api/auth/verify-otp/", data)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        user = User.objects.get(username="otp_registered_user")
        self.assertEqual(user.profile.phone_number, "9123456789")

    def test_current_user_profile_update(self):
        """Verify PATCH /api/auth/me/ updates phone_number."""
        self.client.force_authenticate(user=self.user)
        # Create profile edit OTP
        EmailOTP.objects.create(
            email=self.user.email,
            otp_code="654321",
            purpose="profile_edit",
            expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )

        res = self.client.patch(
            "/api/auth/me/",
            {
                "first_name": "Joseph",
                "last_name": "Doe",
                "phone_number": "9988776655",
                "otp": "654321",
            },
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["phone_number"], "9988776655")
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.phone_number, "9988776655")

    def test_admin_edit_user_all_fields_and_password(self):
        """Verify admin can PATCH any user's username, email, phone, status, and new password."""
        self.client.force_authenticate(user=self.admin)

        payload = {
            "username": "corrected_joe",
            "email": "corrected_joe@example.com",
            "phone_number": "9123409876",
            "first_name": "Joe",
            "last_name": "Customer",
            "is_active": True,
            "is_staff": False,
            "new_password": "brandNewPassword999!",
        }
        res = self.client.patch(f"/api/admin/users/{self.user.id}/", payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["username"], "corrected_joe")
        self.assertEqual(res.data["email"], "corrected_joe@example.com")
        self.assertEqual(res.data["phone_number"], "9123409876")

        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "corrected_joe")
        self.assertEqual(self.user.email, "corrected_joe@example.com")
        self.assertEqual(self.user.profile.phone_number, "9123409876")
        # Check login with new password
        self.assertTrue(self.user.check_password("brandNewPassword999!"))

    def test_admin_cannot_deactivate_self(self):
        """Verify safety restriction preventing admin from deactivating their own account."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f"/api/admin/users/{self.admin.id}/", {"is_active": False})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

