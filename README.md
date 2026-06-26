# MSTS-GJS Production Store

A complete digital asset marketplace for MSTS and Open Rails releases by GJS Production. It includes a Django REST backend, a Next.js storefront/admin UI, and an Expo React Native app.

## Project Structure

```text
backend/    Django REST Framework API, Django Admin, seed data
frontend/   Next.js TypeScript Tailwind storefront and custom admin dashboard
mobile/     Expo React Native app using the same backend APIs
desktop/    Electron + Next.js desktop EXE launcher/store
```

## Features

- Dark cinematic railway-inspired marketplace UI with GJS Production branding.
- Asset categories: Trains, Routes, Sounds, Cab Views, Textures, Free Downloads, Premium Downloads.
- Product listing, filters, detail pages, wishlist, reviews, purchases, download history, and contact screens.
- Django models for Category, Asset, AssetImage, AssetFile, Order, Payment, DownloadLog, Review, Wishlist, and UpdateLog.
- JWT auth with register/login endpoints.
- Protected downloads: logged-in users can download free assets; paid assets require a paid order.
- Custom admin support through `/admin-dashboard`; Django Admin is kept only at `/developer-admin/` for developer maintenance.
- Premium dark admin dashboard with collapsible sidebar, charts, railway asset cards, analytics tables, and shadcn-style UI components.
- Admin asset create/edit forms support direct `.zip`, `.rar`, and `.7z` package uploads for downloadable products.
- Cashfree-first payment verification with development fallback.
- Cloudinary/S3-ready file storage settings.
- GJS RailForge Launcher desktop app with downloads, installs, updates, settings, and EXE build support.

## Local Setup

1. Copy environment values:

```bash
copy .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Run the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py seed_assets
python manage.py createsuperuser
python manage.py runserver
```

Backend API: `http://localhost:8000/api/`  
Custom Admin Dashboard: `http://localhost:3000/admin-dashboard`  
Developer-only Django Admin: `http://localhost:8000/developer-admin/`

If you register a normal user and want to make it an admin for the custom dashboard:

```bash
cd backend
python manage.py make_staff your_username --superuser
```

4. Run the website:

```bash
cd frontend
npm install
npm run dev
```

Website: `http://localhost:3000`

5. Run the mobile app:

```bash
cd mobile
npm install
npm run start
```

Use Expo Go or an emulator. For Android emulator access to the host backend, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api`.

6. Run the desktop launcher:

```bash
cd desktop
npm install
npm run dev
```

Build the Windows installer:

```bash
cd desktop
npm run dist
```

Desktop launcher details are in [desktop/README.md](desktop/README.md).

## Main API Endpoints

- `GET /api/assets/`
- `GET /api/assets/:slug/`
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/orders/create/`
- `POST /api/payments/verify/`
- `GET /api/user/purchases/`
- `GET /api/user/downloads/`
- `POST /api/assets/:slug/download/`
- `POST /api/reviews/`
- `POST /api/wishlist/`
- `GET /api/admin/stats/`
- `GET /api/admin/assets/`
- `GET /api/admin/orders/`
- `GET /api/admin/users/`
- `GET /api/admin/reviews/`
- `GET /api/admin/settings/`

## Sample Data

Run `python manage.py seed_assets` to create starter GJS Production assets, including a WDM-3A locomotive pack, Konkan route demo, sound suite, and cab view kit.

## Production Notes

See [DEPLOYMENT.md](DEPLOYMENT.md) for PostgreSQL, backend, frontend, mobile, payment, storage, and security deployment guidance.

For all local URLs and user/admin testing flow, see [URL_FLOW.md](URL_FLOW.md).

## Detailed Guides

- [GitHub Upload Checklist](GITHUB_UPLOAD_CHECKLIST.md) - explains what is safe to push and what must stay private.
- [Deployment Commands Reference](DEPLOY_COMMANDS.md) - copy-paste commands for GitHub, Render, Vercel, seeding, and admin setup.
- [Project Structure Guide](PROJECT_STRUCTURE_GUIDE.md) - explains the folders and important files.
- [Website Guide](WEBSITE_GUIDE.md) - explains how to run and use the website/admin dashboard.
- [Desktop App Guide](DESKTOP_APP_GUIDE.md) - explains how to run and build the Windows desktop app.
- [APK / Mobile App Guide](APK_MOBILE_GUIDE.md) - explains how to run the mobile app and prepare an Android APK.
