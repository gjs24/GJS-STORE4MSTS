# Generated manually to drop legacy not-null constraints on store_emailotp in PostgreSQL

from django.db import migrations


def drop_legacy_constraints(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == "postgresql":
            cursor.execute("""
                DO $$
                DECLARE
                    col RECORD;
                BEGIN
                    -- Drop NOT NULL from all legacy columns in store_emailotp
                    FOR col IN 
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'store_emailotp' 
                          AND column_name NOT IN ('id', 'email', 'otp_code', 'purpose', 'created_at', 'expires_at', 'is_used', 'attempts')
                    LOOP
                        EXECUTE format('ALTER TABLE store_emailotp ALTER COLUMN %I DROP NOT NULL', col.column_name);
                    END LOOP;
                END $$;

                -- Also explicitly drop legacy code_hash column if present
                ALTER TABLE IF EXISTS store_emailotp DROP COLUMN IF EXISTS code_hash;
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0023_repair_emailotp_columns'),
    ]

    operations = [
        migrations.RunPython(drop_legacy_constraints, reverse_code=migrations.RunPython.noop),
    ]

