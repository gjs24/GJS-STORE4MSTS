import logging
import os

from django.core.wsgi import get_wsgi_application

logger = logging.getLogger(__name__)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()

# Ensure all database migrations are applied on server startup
try:
    from django.core.management import call_command
    call_command("migrate", interactive=False)
    logger.info("Startup database migration check completed.")
except Exception as exc:
    logger.warning("Startup database migration check failed: %s", exc)

