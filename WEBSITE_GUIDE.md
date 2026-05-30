# Website Guide

This guide explains how to run and use the MSTS-GJS Production Store website.

## What The Website Does

The website is the main ecommerce storefront for digital MSTS/Open Rails assets. Users can:

- Browse train models, routes, textures, sounds, cab views, and 3D assets.
- Register and login.
- Buy paid digital assets.
- Download free or purchased assets.
- View purchases and download history.
- Use wishlist and reviews.
- Read required policy pages for Razorpay approval.
- Admins can manage assets, orders, users, downloads, reviews, and settings.

## Required Services

The website needs the backend API running first.

Backend local URL:

```text
http://localhost:8000/api
```

Website local URL:

```text
http://localhost:3000
```

## Environment Setup

Copy the example environment file:

```bash
copy .env.example .env
```

Important website/backend values:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

Do not put real secret keys in public documentation or GitHub.

## Start Database

From project root:

```bash
docker compose up -d
```

This starts PostgreSQL on:

```text
localhost:5432
```

## Start Backend

Open a terminal:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_assets
python manage.py runserver
```

Backend will run at:

```text
http://localhost:8000
```

## Create Admin User

Create a Django superuser:

```bash
cd backend
python manage.py createsuperuser
```

If you already registered a normal user and want to make that user admin:

```bash
cd backend
python manage.py make_staff your_username --superuser
```

## Start Website

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Main Website Pages

| URL | Use |
| --- | --- |
| `/` | Home page. |
| `/assets` | Browse all digital assets. |
| `/assets/[slug]` | Product detail page. |
| `/categories` | Browse categories. |
| `/login` | Customer login. |
| `/register` | Customer registration. |
| `/dashboard` | Customer dashboard. |
| `/dashboard/purchases` | Customer purchases. |
| `/dashboard/downloads` | Customer downloads. |
| `/wishlist` | Customer wishlist. |
| `/contact` | Contact/support page. |
| `/privacy-policy` | Privacy Policy. |
| `/terms-and-conditions` | Terms & Conditions. |
| `/cancellation-refund-policy` | Cancellation & Refund Policy. |
| `/shipping-delivery-policy` | Shipping/Delivery Policy. |
| `/admin-login` | Custom admin login page. |
| `/admin-dashboard` | Main admin dashboard. |

## Admin Dashboard Pages

| URL | Use |
| --- | --- |
| `/admin-dashboard` | Admin overview with stats/charts. |
| `/admin-dashboard/assets` | View/manage assets. |
| `/admin-dashboard/assets/create` | Create a new asset. |
| `/admin-dashboard/assets/[id]/edit` | Edit an asset. |
| `/admin-dashboard/orders` | Manage customer orders. |
| `/admin-dashboard/downloads` | View download logs. |
| `/admin-dashboard/reviews` | Manage reviews. |
| `/admin-dashboard/users` | Manage users. |
| `/admin-dashboard/settings` | Store/admin settings. |

## Payment Flow

1. User opens a paid asset.
2. User starts checkout.
3. Payment is processed by Razorpay.
4. Backend verifies payment status.
5. Order becomes paid.
6. Download access is enabled.

Full card, UPI, and bank details are not stored on the project server. Razorpay handles payment details.

## Digital Download Flow

1. Free assets can be downloaded by logged-in users.
2. Paid assets require a paid order.
3. Backend checks permission.
4. Download is logged.
5. File is served from local media or cloud storage depending on configuration.

## Policy Pages Added For Razorpay

Footer links include:

- Privacy Policy
- Terms & Conditions
- Cancellation & Refund Policy
- Shipping/Delivery Policy
- Contact Us

These pages clearly mention that MSTS-GJS Production Store sells digital products only. No physical shipping is provided.

## Build Website

Before deployment, check build:

```bash
cd frontend
npm run build
```

Run lint:

```bash
cd frontend
npm run lint
```

Start production server after build:

```bash
cd frontend
npm run start
```

## Common Problems

| Problem | Fix |
| --- | --- |
| Website opens but products do not load | Start backend at `http://localhost:8000`. |
| CORS error | Check `CORS_ALLOWED_ORIGINS` in `.env`. |
| Admin dashboard login fails | Make sure user is staff/superuser. |
| Downloads fail | Check paid order status, media file path, and backend logs. |
| Razorpay fails | Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. |

