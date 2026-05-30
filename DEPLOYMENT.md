# Production Deployment Guide

## Backend
1. Provision PostgreSQL and create a database.
2. Configure environment variables from `.env.example`.
3. Use a production WSGI server such as Gunicorn behind Nginx.
4. Run:

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic
python manage.py createsuperuser
```

5. Store uploaded ZIP/RAR files on Cloudinary or S3. For paid downloads, keep buckets private and replace the local file URL response with short-lived signed URLs.
6. Set `DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, strong `JWT_SECRET_KEY`, and exact `DJANGO_ALLOWED_HOSTS`.

The easy admin experience is the custom dashboard at `/admin-dashboard` in the Next.js app. Django's built-in admin is moved to `/developer-admin/` for emergency developer maintenance only.

## Frontend
Deploy `frontend` to Vercel, Netlify, or any Node host.

```bash
cd frontend
npm install
npm run build
npm run start
```

Set `NEXT_PUBLIC_API_URL=https://your-api-domain.com/api`.

## Mobile
Use EAS Build for Expo:

```bash
cd mobile
npm install
npx expo login
npx eas build -p android
```

Set `EXPO_PUBLIC_API_URL=https://your-api-domain.com/api`.

## Payments
- Razorpay is the primary India payment provider.
- `POST /api/orders/create/` creates a pending order for premium assets.
- `POST /api/payments/verify/` marks the order paid only after signature verification.
- In development, payment verification is relaxed when `DJANGO_DEBUG=True`.

## Security Checklist
- Use HTTPS everywhere.
- Restrict admin dashboard routes to staff users before exposing write actions.
- Keep paid asset files private and serve signed URLs.
- Enable database backups.
- Configure CORS for exact web and mobile origins.
- Add monitoring for failed payment verification and download abuse.
