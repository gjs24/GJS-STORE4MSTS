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

# Direct PostgreSQL column check for store_emailotp
try:
    from django.db import connection
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute("""
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6) NOT NULL DEFAULT '';
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS email VARCHAR(254) NOT NULL DEFAULT '';
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'login';
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE IF EXISTS store_emailotp 
                ADD COLUMN IF NOT EXISTS attempts SMALLINT NOT NULL DEFAULT 0;

                DO $$
                DECLARE
                    col RECORD;
                BEGIN
                    FOR col IN 
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'store_emailotp' 
                          AND column_name NOT IN ('id', 'email', 'otp_code', 'purpose', 'created_at', 'expires_at', 'is_used', 'attempts')
                    LOOP
                        EXECUTE format('ALTER TABLE store_emailotp ALTER COLUMN %I DROP NOT NULL', col.column_name);
                    END LOOP;
                END $$;

                ALTER TABLE IF EXISTS store_emailotp DROP COLUMN IF EXISTS code_hash;
            """)
            logger.info("Verified store_emailotp columns and removed legacy constraints on PostgreSQL.")
except Exception as exc:
    logger.warning("Direct column check error: %s", exc)


