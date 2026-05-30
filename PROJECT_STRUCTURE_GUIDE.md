# Project Structure Guide

This file explains the main folders and files in the MSTS-GJS Production Store project. The project has four major parts:

- `backend/` - Django REST API and database logic
- `frontend/` - Next.js website and admin dashboard
- `desktop/` - Electron desktop app / Windows EXE launcher
- `mobile/` - Expo React Native mobile app for APK/mobile use

## Root Files

| File | Purpose |
| --- | --- |
| `.env` | Local private environment settings. Keep real keys here. Do not share this file publicly. |
| `.env.example` | Example environment settings for other developers or deployment setup. |
| `README.md` | Main quick-start documentation for the whole project. |
| `DEPLOYMENT.md` | Deployment notes for production hosting. |
| `URL_FLOW.md` | Important local URLs and user/admin testing flow. |
| `docker-compose.yml` | Starts PostgreSQL locally using Docker. |
| `PROJECT_STRUCTURE_GUIDE.md` | This guide. Explains folders and files. |
| `WEBSITE_GUIDE.md` | Website setup and usage guide. |
| `DESKTOP_APP_GUIDE.md` | Desktop app setup and EXE build guide. |
| `APK_MOBILE_GUIDE.md` | Mobile app and APK guide. |

## Backend Folder

`backend/` contains the Django API used by the website, desktop app, and mobile app.

| File/Folder | Purpose |
| --- | --- |
| `backend/manage.py` | Django command runner. Used for migrations, server, superuser, seed data, and staff creation. |
| `backend/db.sqlite3` | Local SQLite database file. For production, PostgreSQL is recommended. |
| `backend/requirements.txt` | Python packages needed by the backend. |
| `backend/config/__init__.py` | Makes `config` a Python package. |
| `backend/config/settings.py` | Main Django settings: apps, database, CORS, JWT, media, payments, storage. |
| `backend/config/urls.py` | Main backend URL routing. Includes API routes and Django admin route. |
| `backend/config/asgi.py` | ASGI entry point for async-compatible deployment. |
| `backend/config/wsgi.py` | WSGI entry point for normal Django deployment. |
| `backend/store/__init__.py` | Makes `store` a Python app package. |
| `backend/store/apps.py` | Django app configuration for `store`. |
| `backend/store/models.py` | Database models like assets, categories, orders, payments, downloads, reviews, wishlist. |
| `backend/store/admin.py` | Django admin registrations for backend maintenance. |
| `backend/store/serializers.py` | Converts Django models to/from API JSON. |
| `backend/store/views.py` | API logic for assets, auth, orders, payments, downloads, admin dashboard data. |
| `backend/store/urls.py` | API URL routes for the store app. |
| `backend/store/permissions.py` | Custom permission checks for admin/user-only API access. |
| `backend/store/throttles.py` | Rate limiting for users, anonymous users, and downloads. |
| `backend/store/migrations/` | Django database migration files. |
| `backend/store/management/commands/seed_assets.py` | Creates sample MSTS/Open Rails assets for local testing. |
| `backend/store/management/commands/make_staff.py` | Makes a user staff/superuser for admin dashboard access. |
| `backend/media/` | Local uploaded/downloadable files. Usually ignored or replaced by cloud storage in production. |

## Frontend Folder

`frontend/` contains the public website, login/register pages, user dashboard, product pages, policy pages, and custom admin dashboard.

| File/Folder | Purpose |
| --- | --- |
| `frontend/package.json` | Website npm scripts and dependencies. |
| `frontend/package-lock.json` | Locked npm dependency versions. |
| `frontend/next.config.mjs` | Next.js configuration. |
| `frontend/tsconfig.json` | TypeScript configuration. |
| `frontend/tailwind.config.ts` | Tailwind CSS theme and design tokens. |
| `frontend/postcss.config.js` | PostCSS setup for Tailwind. |
| `frontend/next-env.d.ts` | Next.js TypeScript environment types. |
| `frontend/app/layout.tsx` | Root website layout. Adds header and footer around pages. |
| `frontend/app/globals.css` | Global CSS, background styles, panels, and theme helpers. |
| `frontend/app/page.tsx` | Website home page. |
| `frontend/app/assets/page.tsx` | Asset marketplace listing page. |
| `frontend/app/assets/[slug]/page.tsx` | Single product/detail page. |
| `frontend/app/categories/page.tsx` | Category browsing page. |
| `frontend/app/login/page.tsx` | Customer login page. |
| `frontend/app/register/page.tsx` | Customer registration page. |
| `frontend/app/dashboard/page.tsx` | Customer account dashboard. |
| `frontend/app/dashboard/purchases/page.tsx` | Customer purchase history page. |
| `frontend/app/dashboard/downloads/page.tsx` | Customer download history page. |
| `frontend/app/wishlist/page.tsx` | Customer wishlist page. |
| `frontend/app/contact/page.tsx` | Contact/support page. |
| `frontend/app/privacy-policy/page.tsx` | Privacy Policy page for Razorpay/compliance. |
| `frontend/app/terms-and-conditions/page.tsx` | Terms & Conditions page. |
| `frontend/app/cancellation-refund-policy/page.tsx` | Cancellation & Refund Policy page. |
| `frontend/app/shipping-delivery-policy/page.tsx` | Shipping/Delivery Policy for digital delivery. |
| `frontend/app/admin-login/page.tsx` | Admin login page for custom admin dashboard. |
| `frontend/app/admin-dashboard/page.tsx` | Main custom admin dashboard. |
| `frontend/app/admin-dashboard/assets/page.tsx` | Admin asset management page. |
| `frontend/app/admin-dashboard/assets/create/page.tsx` | Admin create asset page. |
| `frontend/app/admin-dashboard/assets/[id]/edit/page.tsx` | Admin edit asset page. |
| `frontend/app/admin-dashboard/orders/page.tsx` | Admin orders page. |
| `frontend/app/admin-dashboard/downloads/page.tsx` | Admin downloads page. |
| `frontend/app/admin-dashboard/reviews/page.tsx` | Admin reviews page. |
| `frontend/app/admin-dashboard/settings/page.tsx` | Admin settings page. |
| `frontend/app/admin-dashboard/users/page.tsx` | Admin users page. |
| `frontend/components/site-header.tsx` | Website top navigation. |
| `frontend/components/site-footer.tsx` | Website footer and policy links. |
| `frontend/components/page-shell.tsx` | Reusable page wrapper/title layout. |
| `frontend/components/legal-page.tsx` | Reusable layout for policy/legal pages. |
| `frontend/components/asset-card.tsx` | Product card used in listings. |
| `frontend/components/asset-actions.tsx` | Product actions like buy/download/wishlist. |
| `frontend/components/auth-form.tsx` | Shared login/register form UI. |
| `frontend/components/auth-nav.tsx` | Header auth buttons/account nav. |
| `frontend/components/account-list.tsx` | Account page list component. |
| `frontend/components/admin-table.tsx` | Reusable admin table. |
| `frontend/components/admin-login-note.tsx` | Admin login help/note component. |
| `frontend/components/ui/button.tsx` | Reusable button component. |
| `frontend/components/ui/card.tsx` | Reusable card component. |
| `frontend/components/ui/badge.tsx` | Reusable badge component. |
| `frontend/components/admin/` | Admin dashboard-specific cards, charts, tables, layout, and quick actions. |
| `frontend/lib/api.ts` | Customer/frontend API helper functions. |
| `frontend/lib/admin-api.ts` | Admin API helper functions. |
| `frontend/lib/admin-dashboard-data.ts` | Admin dashboard data shaping/helpers. |
| `frontend/lib/store-api.ts` | Store API helper utilities. |
| `frontend/lib/utils.ts` | General frontend utility functions. |

## Desktop Folder

`desktop/` contains the Electron desktop launcher. It has two parts: Electron native code and a Next.js renderer UI.

| File/Folder | Purpose |
| --- | --- |
| `desktop/package.json` | Desktop app scripts, Electron dependencies, and EXE build settings. |
| `desktop/README.md` | Existing desktop-specific guide. |
| `desktop/tsconfig.electron.json` | TypeScript config for Electron main process files. |
| `desktop/electron/main.ts` | Electron main process. Creates app window and app lifecycle. |
| `desktop/electron/preload.ts` | Secure bridge between renderer UI and Electron native APIs. |
| `desktop/electron/types.ts` | Shared Electron/launcher TypeScript types. |
| `desktop/electron/store.ts` | Local desktop app settings/storage helper. |
| `desktop/electron/download-manager.ts` | Download manager with progress/resume-related logic. |
| `desktop/electron/installer.ts` | Local install/uninstall logic for downloaded assets. |
| `desktop/electron/path-detection.ts` | Detects MSTS/Open Rails installation paths. |
| `desktop/renderer/package.json` | Renderer UI package metadata. |
| `desktop/renderer/next.config.mjs` | Next.js config for the desktop renderer. |
| `desktop/renderer/tsconfig.json` | TypeScript config for renderer UI. |
| `desktop/renderer/tailwind.config.ts` | Tailwind theme for desktop UI. |
| `desktop/renderer/postcss.config.js` | PostCSS setup for desktop renderer. |
| `desktop/renderer/app/layout.tsx` | Desktop renderer root layout. |
| `desktop/renderer/app/page.tsx` | Desktop home/dashboard page. |
| `desktop/renderer/app/store/page.tsx` | Desktop asset store page. |
| `desktop/renderer/app/downloads/page.tsx` | Desktop downloads page. |
| `desktop/renderer/app/installed/page.tsx` | Installed assets manager. |
| `desktop/renderer/app/settings/page.tsx` | Desktop app settings. |
| `desktop/renderer/app/login/page.tsx` | Desktop login page. |
| `desktop/renderer/app/about/page.tsx` | Desktop about page. |
| `desktop/renderer/app/globals.css` | Global desktop UI styles. |
| `desktop/renderer/components/` | Desktop UI components like sidebar, topbar, stats, asset cards. |
| `desktop/renderer/lib/api.ts` | Desktop renderer API helper. |
| `desktop/renderer/lib/types.ts` | Desktop renderer TypeScript types. |
| `desktop/renderer/lib/railforge.d.ts` | Type definitions for the Electron bridge/window API. |

## Mobile Folder

`mobile/` contains the Expo React Native app. This is the base for Android APK/mobile usage.

| File/Folder | Purpose |
| --- | --- |
| `mobile/package.json` | Mobile app scripts and Expo dependencies. |
| `mobile/app.json` | Expo app configuration: name, slug, version, Android settings. |
| `mobile/tsconfig.json` | TypeScript configuration for the mobile app. |
| `mobile/app/_layout.tsx` | Expo Router root layout/navigation. |
| `mobile/app/index.tsx` | Mobile home screen. |
| `mobile/app/assets.tsx` | Mobile asset listing screen. |
| `mobile/app/asset/[slug].tsx` | Mobile asset detail screen. |
| `mobile/app/login.tsx` | Mobile login screen. |
| `mobile/app/register.tsx` | Mobile registration screen. |
| `mobile/app/profile.tsx` | Mobile profile/account screen. |
| `mobile/app/purchases.tsx` | Mobile purchase history screen. |
| `mobile/app/downloads.tsx` | Mobile downloads screen. |
| `mobile/src/lib/api.ts` | Mobile API helper using `EXPO_PUBLIC_API_URL`. |
| `mobile/src/components/AssetCard.tsx` | Mobile reusable asset card component. |

## Generated Folders

These folders are created by tools and normally should not be edited manually:

- `frontend/node_modules/`
- `desktop/node_modules/`
- `mobile/node_modules/`
- `frontend/.next/`
- `desktop/renderer/.next/`
- Python `__pycache__/` folders
- Desktop `release/` output after EXE build

