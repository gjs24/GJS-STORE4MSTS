# Free Deployment Guide

This project can run on free tiers for demos and early testing:

- Frontend: Vercel Hobby
- Backend API: Render Free Web Service
- Database: Neon Free or Supabase Free PostgreSQL
- Uploaded files: Cloudinary Free
- Domain: free provider subdomains first

## 1. Free Database

Create a free PostgreSQL database on Neon or Supabase and copy the pooled connection string.

Set it as:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
```

## 2. Free Backend on Render

1. Push this repo to GitHub.
2. In Render, choose **New > Blueprint** and select this repository.
3. Render will read `render.yaml`.
4. Add these environment values after the service is created:

```env
DATABASE_URL=your-neon-or-supabase-postgres-url
DJANGO_ALLOWED_HOSTS=msts-gjs-api.onrender.com
CORS_ALLOWED_ORIGINS=https://your-vercel-site.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-vercel-site.vercel.app
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
RAZORPAY_KEY_ID=optional-for-live-payments
RAZORPAY_KEY_SECRET=optional-for-live-payments
STRIPE_SECRET_KEY=optional-if-using-stripe
```

Use your actual Render backend URL in `DJANGO_ALLOWED_HOSTS`.

## 3. Free Frontend on Vercel

1. Import the GitHub repo into Vercel.
2. Set **Root Directory** to `frontend`.
3. Keep the default Next.js build settings.
4. Add this environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com/api
```

After the first Vercel deploy, return to Render and update:

```env
CORS_ALLOWED_ORIGINS=https://your-vercel-site.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-vercel-site.vercel.app
```

Then redeploy the Render backend.

## 4. Create Admin User

Open Render Shell for the backend service and run:

```bash
python manage.py createsuperuser
```

## 5. Free Tier Notes

- Render free services can sleep when inactive, so the first API request may be slow.
- Free databases and Cloudinary have storage/bandwidth limits.
- Use a paid plan before serious paid downloads or high traffic.
