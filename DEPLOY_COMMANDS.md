# Deployment Commands Reference

Use this file when deploying, seeding assets, or making an admin user.

## GitHub Upload

Check that private files are not staged:

```bash
git status --short
git ls-files .env backend/db.sqlite3 backend/media frontend/.next frontend/node_modules
```

Commit and push changes:

```bash
git add .
git commit -m "Prepare store for Razorpay-ready deployment"
git branch -M main
git remote set-url origin https://github.com/gjs24/GJS-STORE4MSTS.git
git push -u origin main
```

For normal later updates:

```bash
git add .
git commit -m "Your message here"
git push
```

## Generate Secret Keys

Run each command separately and use different values for `DJANGO_SECRET_KEY` and `JWT_SECRET_KEY`.

```powershell
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

## Render Backend Settings

Render web service:

```text
Name: msts-gjs-api
Root Directory: backend
Runtime: Python 3
Build Command: pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
Start Command: gunicorn config.wsgi:application
Plan: Free
```

Render backend environment variables:

```env
DATABASE_URL=paste_render_postgres_database_url_here
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=msts-gjs-api.onrender.com
CORS_ALLOWED_ORIGINS=https://your-vercel-site.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-vercel-site.vercel.app
DJANGO_SECRET_KEY=paste_generated_secret_here
JWT_SECRET_KEY=paste_different_generated_secret_here
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
RAZORPAY_KEY_ID=rzp_test_or_live_key_id
RAZORPAY_KEY_SECRET=razorpay_secret_key
PRIVATE_DOWNLOAD_BUCKET=your-private-download-bucket
PRIVATE_DOWNLOAD_REGION=auto
PRIVATE_DOWNLOAD_ENDPOINT_URL=https://account-id.r2.cloudflarestorage.com
PRIVATE_DOWNLOAD_ACCESS_KEY_ID=your-private-download-access-key
PRIVATE_DOWNLOAD_SECRET_ACCESS_KEY=your-private-download-secret-key
PRIVATE_DOWNLOAD_URL_EXPIRE_SECONDS=300
```

After changing Render environment variables:

```text
Manual Deploy -> Deploy latest commit
```

## Vercel Frontend Settings

Vercel project:

```text
Repository: gjs24/GJS-STORE4MSTS
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Install Command: npm install
Output Directory: empty/default
Node.js Version: 20.x or 22.x
```

Vercel frontend environment variables:

```env
NEXT_PUBLIC_API_URL=https://msts-gjs-api.onrender.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_or_live_key_id
NEXT_PUBLIC_BUSINESS_NAME=MSTS-GJS Production Store
NEXT_PUBLIC_SUPPORT_EMAIL=gjs2721@gmail.com
NEXT_PUBLIC_SUPPORT_PHONE=+91-7845727002
NEXT_PUBLIC_BUSINESS_ADDRESS=No 18 Kamala Nehru Colony, Arumuganeri, Tamilnadu, India - 628202
```

Redeploy after settings changes:

```text
Deployments -> Redeploy -> Redeploy without Build Cache
```

## Seed Assets Without Render Shell

Render Shell is paid. To seed the production Render database from your PC, copy the Render Postgres **External Database URL** and run:

```powershell
cd C:\Users\jebas\Desktop\MSTS-GJS_PRODUCTION-STORE\backend
$env:DATABASE_URL="paste_external_database_url_here"
$env:DJANGO_DEBUG="False"
$env:DJANGO_ALLOWED_HOSTS="msts-gjs-api.onrender.com"
$env:CORS_ALLOWED_ORIGINS="https://your-vercel-site.vercel.app"
$env:CSRF_TRUSTED_ORIGINS="https://your-vercel-site.vercel.app"
.\.venv\Scripts\python.exe manage.py seed_assets
```

Check API assets:

```text
https://msts-gjs-api.onrender.com/api/assets/
```

Do not test downloads by opening raw `/media/...` URLs on Render. Production downloads are protected and should be started from the website while logged in, or through:

```text
POST https://msts-gjs-api.onrender.com/api/assets/<asset_id>/download/
```

## Make A User Admin Without Render Shell

First register a normal user on:

```text
https://your-vercel-site.vercel.app/register
```

Then run from your PC:

```powershell
cd C:\Users\jebas\Desktop\MSTS-GJS_PRODUCTION-STORE\backend
$env:DATABASE_URL="paste_external_database_url_here"
$env:DJANGO_DEBUG="False"
$env:DJANGO_ALLOWED_HOSTS="msts-gjs-api.onrender.com"
.\.venv\Scripts\python.exe manage.py make_staff YOUR_USERNAME --superuser
```

Example:

```powershell
.\.venv\Scripts\python.exe manage.py make_staff gjsadmin --superuser
```

Admin login:

```text
https://your-vercel-site.vercel.app/admin-login
```

Admin dashboard:

```text
https://your-vercel-site.vercel.app/admin-dashboard
```

## Admin Asset Upload

Open:

```text
https://your-vercel-site.vercel.app/admin-dashboard/assets/create
```

Required product details:

```text
Title
Category
Description
Short description
Simulator type
Version
File size
Price
Requirements
Installation steps
Download file: .zip, .rar, or .7z
```

Set the product card/home image with:

```text
Product card / home image
```

This image appears on the home page, asset cards, and product detail page.

To show a product in the home page upcoming section, enable:

```text
Upcoming product / coming soon
```

Upcoming products are visible to users but checkout and downloads are blocked until you edit the asset and turn this option off.

Important: Render free service storage is not permanent. Uploaded files stored in `backend/media/` can disappear after redeploy. For real paid files, configure Cloudinary or S3.

For paid large files such as 300 MB+ ZIP packages, use the private S3/R2 object-key flow:

```text
Cloudflare R2 / S3 -> private bucket -> upload ZIP -> copy object key
Admin Dashboard -> Edit Asset -> Private S3/R2 object key -> Paste key -> Save
```

The backend signs a short-lived download URL only after login/purchase, so users cannot share a permanent public file link.

## Useful Test URLs

Backend:

```text
https://msts-gjs-api.onrender.com/api/
https://msts-gjs-api.onrender.com/api/assets/
```

Frontend:

```text
https://your-vercel-site.vercel.app/
https://your-vercel-site.vercel.app/assets
https://your-vercel-site.vercel.app/contact
https://your-vercel-site.vercel.app/privacy-policy
https://your-vercel-site.vercel.app/terms-and-conditions
https://your-vercel-site.vercel.app/cancellation-refund-policy
https://your-vercel-site.vercel.app/shipping-delivery-policy
```
