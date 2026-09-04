# Generated manually to repair missing columns in store_emailotp on PostgreSQL

from django.db import migrations


def repair_emailotp_table(apps, schema_editor):
    connection = schema_editor.connection
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
            """)
        elif connection.vendor == "sqlite":
            cursor.execute("PRAGMA table_info(store_emailotp)")
            columns = [row[1] for row in cursor.fetchall()]
            if "otp_code" not in columns and len(columns) > 0:
                cursor.execute("ALTER TABLE store_emailotp ADD COLUMN otp_code VARCHAR(6) NOT NULL DEFAULT ''")


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0022_emailotp'),
    ]

    operations = [
        migrations.RunPython(repair_emailotp_table, reverse_code=migrations.RunPython.noop),
    ]
