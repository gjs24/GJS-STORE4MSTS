from datetime import timedelta
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from store.models import AdminActivityLog


class AdminActivityLogTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="admin", email="admin@example.com", password="adminpassword123"
        )
        self.regular_user = User.objects.create_user(
            username="user", email="user@example.com", password="userpassword123"
        )

        now = timezone.now()
        # Create log from today (0 days ago)
        self.log_recent = AdminActivityLog.objects.create(
            actor=self.admin_user,
            action="Updated Settings",
            target_type="SiteSetting",
            target_id="1",
            message="Updated hero banner",
        )

        # Create log from 10 days ago
        self.log_10d = AdminActivityLog.objects.create(
            actor=self.admin_user,
            action="Created Product",
            target_type="Asset",
            target_id="101",
            message="Added WAP-7 Loco",
        )
        AdminActivityLog.objects.filter(id=self.log_10d.id).update(
            created_at=now - timedelta(days=10)
        )

        # Create log from 45 days ago
        self.log_45d = AdminActivityLog.objects.create(
            actor=self.admin_user,
            action="Approved Order",
            target_type="Order",
            target_id="55",
            message="Approved order #55",
        )
        AdminActivityLog.objects.filter(id=self.log_45d.id).update(
            created_at=now - timedelta(days=45)
        )

        self.url = reverse("admin-activity-logs")

    def test_unauthenticated_or_regular_user_denied(self):
        # Unauthenticated
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Regular user
        self.client.force_authenticate(user=self.regular_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_default_filters_to_last_30_days(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ids = [item["id"] for item in res.data]
        # Should include recent and 10d, but exclude 45d
        self.assertIn(self.log_recent.id, ids)
        self.assertIn(self.log_10d.id, ids)
        self.assertNotIn(self.log_45d.id, ids)

    def test_filter_days_all(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get(f"{self.url}?days=all")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        ids = [item["id"] for item in res.data]
        self.assertIn(self.log_recent.id, ids)
        self.assertIn(self.log_10d.id, ids)
        self.assertIn(self.log_45d.id, ids)

    def test_purge_older_than_30_days(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.delete(f"{self.url}?older_than_days=30")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["deleted_count"], 1)

        # 45d log should be deleted, others remain
        self.assertFalse(AdminActivityLog.objects.filter(id=self.log_45d.id).exists())
        self.assertTrue(AdminActivityLog.objects.filter(id=self.log_recent.id).exists())
        self.assertTrue(AdminActivityLog.objects.filter(id=self.log_10d.id).exists())

    def test_delete_selected_ids(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.delete(
            self.url,
            data={"ids": [self.log_recent.id, self.log_10d.id]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["deleted_count"], 2)

        self.assertFalse(AdminActivityLog.objects.filter(id=self.log_recent.id).exists())
        self.assertFalse(AdminActivityLog.objects.filter(id=self.log_10d.id).exists())
        self.assertTrue(AdminActivityLog.objects.filter(id=self.log_45d.id).exists())

    def test_purge_all(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.delete(f"{self.url}?all=true")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["deleted_count"], 3)
        self.assertEqual(AdminActivityLog.objects.count(), 0)
