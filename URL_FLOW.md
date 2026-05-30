# MSTS-GJS Store URL & Flow Guide

This file explains which URL to open, why it exists, and the normal flow for users and admins.

## Local Servers

Open URLs in the browser address bar, not in PowerShell. PowerShell is only for commands like `npm run dev:clean`.

| App | URL | Why |
| --- | --- | --- |
| Backend API | `http://127.0.0.1:8000/api/` | Django REST API used by website, mobile app, and desktop launcher. |
| User Website | `http://localhost:3000` | Public customer marketplace. No admin link is shown in the user navbar. |
| Admin Website | `http://localhost:3000/admin-dashboard` | Separate back-office admin panel. Open this URL directly. |
| Developer Django Admin | `http://127.0.0.1:8000/developer-admin/` | Backup developer-only Django admin. Do not use as the main admin UI. |
| Mobile App | Expo URL shown by `npm run start` in `mobile/` | React Native app for users. |
| Desktop Launcher | Electron window from `npm run dev` in `desktop/` | Desktop EXE launcher/store for downloads and installs. |

## User Website URLs

The user side is for browsing, search, filtering, purchase, wishlist, support, and downloads. It should not show an Admin button.

| Page | URL | Purpose |
| --- | --- | --- |
| Home | `http://localhost:3000/` | Main landing page with featured MSTS/Open Rails assets. |
| Asset Store | `http://localhost:3000/assets` | Browse all assets. |
| Search Assets | `http://localhost:3000/assets?search=wap` | Search by title/description. |
| Category Filter | `http://localhost:3000/assets?category=trains` | Show assets in one category. |
| Free Assets | `http://localhost:3000/assets?price=free` | Show free downloads. |
| Premium Assets | `http://localhost:3000/assets?price=premium` | Show paid downloads. |
| MSTS Assets | `http://localhost:3000/assets?simulator_type=MSTS` | Show MSTS-compatible assets. |
| Open Rails Assets | `http://localhost:3000/assets?simulator_type=OPEN_RAILS` | Show Open Rails-compatible assets. |
| Asset Detail | `http://localhost:3000/assets/konkan-coastal-route-demo` | Product page with description, version, file size, requirements, changelog, and download/checkout button. |
| Categories | `http://localhost:3000/categories` | Browse all asset categories. |
| User Login | `http://localhost:3000/login` | Customer login only. Normal users go to `/dashboard`. |
| Admin Login | `http://localhost:3000/admin-login` | Separate staff/superuser login for admin dashboard. |
| Register | `http://localhost:3000/register` | Create normal user account. |
| User Dashboard | `http://localhost:3000/dashboard` | User account overview. |
| My Purchases | `http://localhost:3000/dashboard/purchases` | Paid assets purchased by the user. |
| Download History | `http://localhost:3000/dashboard/downloads` | User download records. |
| Wishlist | `http://localhost:3000/wishlist` | Saved assets. |
| Contact | `http://localhost:3000/contact` | Support/contact page. |

## Admin Website URLs

The admin side is separate from the user store. Use these pages after logging in with a staff/superuser account.

| Page | URL | Purpose |
| --- | --- | --- |
| Admin Dashboard | `http://localhost:3000/admin-dashboard` | Premium admin overview with stats, charts, latest orders, recent users, top assets. |
| Manage Assets | `http://localhost:3000/admin-dashboard/assets` | View assets, preview product pages, feature/unfeature assets. |
| Create Product | `http://localhost:3000/admin-dashboard/assets/create` | Add a new product and set price. |
| Orders | `http://localhost:3000/admin-dashboard/orders` | View orders and update payment/order status. |
| Users | `http://localhost:3000/admin-dashboard/users` | View users and activate/disable accounts. |
| Reviews | `http://localhost:3000/admin-dashboard/reviews` | Approve or delete reviews. |
| Downloads | `http://localhost:3000/admin-dashboard/downloads` | View download analytics and queue UI. |
| Settings | `http://localhost:3000/admin-dashboard/settings` | View API, payment, storage, security, and system status. |

## Admin Login Flow

1. Create a superuser:

```powershell
cd backend
python manage.py createsuperuser
```

2. Start backend:

```powershell
python manage.py runserver
```

3. Start frontend:

```powershell
cd ../frontend
npm run dev
```

4. Login with the superuser username:

```text
http://localhost:3000/admin-login
```

5. Open the admin dashboard:

```text
http://localhost:3000/admin-dashboard
```

The public user navbar does not show this link. Admins should bookmark `/admin-dashboard` or open it directly.

If you registered a normal account and want to make it admin:

```powershell
cd backend
python manage.py make_staff USERNAME --superuser
```

## New Product Flow

1. Login as admin:

```text
http://localhost:3000/admin-login
```

2. Open create product:

```text
http://localhost:3000/admin-dashboard/assets/create
```

3. Fill:

- Product title
- Category
- Simulator type
- Version
- File size
- Price type: `Premium / Paid` or `Free Download`
- Price in INR, for example `149.00`
- Short description
- Full description
- Asset ZIP/RAR/7Z file
- Requirements
- Installation steps
- Changelog

4. Upload the downloadable asset package in `Asset ZIP/RAR/7Z file`.

Allowed file types:

- `.zip`
- `.rar`
- `.7z`

5. Click `Create product`.

6. Check it in:

```text
http://localhost:3000/admin-dashboard/assets
```

7. Preview the public product page from the asset row.

8. To replace the file later, open:

```text
http://localhost:3000/admin-dashboard/assets
```

Then click the edit pencil on the product and use `Replace ZIP/RAR/7Z file`.

## User Purchase & Download Flow

1. User registers:

```text
http://localhost:3000/register
```

2. User logs in:

```text
http://localhost:3000/login
```

3. User browses assets:

```text
http://localhost:3000/assets
```

4. User opens an asset detail page.

5. If the asset is free:

- User clicks free download.
- Backend checks that the user is logged in.
- Backend creates a download log.
- Backend returns protected download URL.

6. If the asset is premium:

- User creates an order.
- User pays through Razorpay/Stripe flow.
- Backend verifies payment.
- Backend marks order as paid.
- User can download the asset.

## Backend API URLs

Base URL:

```text
http://127.0.0.1:8000/api
```

### Public/User API

| Method | URL | Purpose |
| --- | --- | --- |
| `GET` | `/api/assets/` | List assets. |
| `GET` | `/api/assets/:slug/` | Get one asset detail. |
| `POST` | `/api/auth/register/` | Register user. |
| `POST` | `/api/auth/login/` | Login and receive JWT token. |
| `GET` | `/api/auth/me/` | Get current logged-in user and staff/admin role. |
| `POST` | `/api/orders/create/` | Create order for asset. |
| `POST` | `/api/payments/verify/` | Verify payment before download access. |
| `GET` | `/api/user/purchases/` | User purchase list. |
| `GET` | `/api/user/downloads/` | User download history. |
| `POST` | `/api/assets/:slug/download/` | Download by asset slug. |
| `POST` | `/api/assets/:id/download/` | Download by asset ID. |
| `POST` | `/api/reviews/` | Add review. |
| `POST` | `/api/wishlist/` | Add wishlist item. |

### Custom Admin API

These require a staff/superuser JWT token.

| Method | URL | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/stats/` | Dashboard stats. |
| `GET` | `/api/admin/settings/` | Payment/storage/security settings status. |
| `GET` | `/api/admin/assets/` | Admin asset list. |
| `POST` | `/api/admin/assets/` | Create product. |
| `PATCH` | `/api/admin/assets/:id/` | Edit product. |
| `POST` | `/api/admin/assets/:id/feature/` | Feature/unfeature product. |
| `GET` | `/api/admin/categories/` | Category list. |
| `POST` | `/api/admin/categories/` | Create category. |
| `GET` | `/api/admin/orders/` | Order list. |
| `PATCH` | `/api/admin/orders/:id/` | Update order status. |
| `GET` | `/api/admin/users/` | User list. |
| `PATCH` | `/api/admin/users/:id/` | Activate/disable user. |
| `GET` | `/api/admin/reviews/` | Review list. |
| `POST` | `/api/admin/reviews/:id/approve/` | Approve review. |
| `DELETE` | `/api/admin/reviews/:id/` | Delete review. |

## Mobile App Flow

Run:

```powershell
cd mobile
npm run start
```

Mobile screens:

| Screen | Purpose |
| --- | --- |
| Home | Featured categories and entry to asset browsing. |
| Asset list | Browse/search assets from backend API. |
| Asset details | View asset and start download/checkout. |
| Login/Register | User authentication. |
| My Downloads | Download history. |
| Purchases | Paid asset list. |
| Profile | Account navigation. |

For Android emulator, use:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
```

## Desktop Launcher Flow

Run:

```powershell
cd desktop
npm run dev
```

Desktop screens:

| Screen | Purpose |
| --- | --- |
| Home | Launcher dashboard. |
| Login/Register | Account access. |
| Store | Browse/download assets. |
| Installed Assets | View installed assets and uninstall. |
| Downloads | Download manager with progress. |
| Settings | API URL, MSTS/Open Rails path, install/cache directories. |
| About | Launcher info and updater status. |

## Common Error Meaning

| Error | Meaning | Fix |
| --- | --- | --- |
| `401 Unauthorized` | Not logged in or token missing. | Users login at `/login`; admins login at `/admin-login`. |
| `403 Forbidden` | Logged in but not staff/admin. | Use superuser or run `python manage.py make_staff USERNAME --superuser`. |
| `Request was throttled` | Too many requests hit the API throttle. | Restart Django for local dev, or increase `DRF_ANON_THROTTLE_RATE` in `.env`. |
| Page looks like plain HTML/no dark design | Next/Tailwind CSS chunks did not load or `.next` cache is stale. | Stop frontend, run `npm run dev:clean`, then hard refresh browser with `Ctrl + F5`. |
| PowerShell says URL is not recognized | A URL was typed into the terminal. | Paste the URL into Chrome/Edge address bar instead. |
| `404 Not Found /favicon.ico` | Browser asked for icon. | Safe to ignore. |
| JWT key warning | JWT secret is too short. | Set `JWT_SECRET_KEY` to 32+ characters in `.env`. |

## Recommended Testing Order

1. Start PostgreSQL.
2. Start backend.
3. Seed assets.
4. Create superuser.
5. Start frontend.
6. Login as admin at `/admin-login`.
7. Open `/admin-dashboard`.
8. Create a product.
9. View it in `/assets`.
10. Register normal user.
11. Test user purchase/download flow.
