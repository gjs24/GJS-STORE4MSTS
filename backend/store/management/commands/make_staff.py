from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promote an existing user to staff/superuser for the custom admin dashboard."

    def add_arguments(self, parser):
        parser.add_argument("username", help="Username to promote")
        parser.add_argument("--superuser", action="store_true", help="Also grant superuser permission")

    def handle(self, *args, **options):
        username = options["username"]
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise CommandError(f"User '{username}' does not exist.") from exc

        user.is_staff = True
        if options["superuser"]:
            user.is_superuser = True
        user.save(update_fields=["is_staff", "is_superuser"])
        role = "superuser" if user.is_superuser else "staff"
        self.stdout.write(self.style.SUCCESS(f"{username} is now {role} and can use /admin-dashboard."))
