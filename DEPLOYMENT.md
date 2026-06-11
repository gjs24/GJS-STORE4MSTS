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

## Public Business Contact
These details must match the live Contact Us page before Razorpay submission:

- Business name: MSTS-GJS Production Store
- Support email: gjs2721@gmail.com
- Support phone: +91-7845727002
- Business address: No 18 Kamala Nehru Colony, Arumuganeri, Tamilnadu, India - 628202

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

## Razorpay Verification Checklist
Complete this before submitting the website/app to Razorpay:

1. Confirm all public contact details are set in production environment variables:
   - `NEXT_PUBLIC_BUSINESS_NAME`
   - `NEXT_PUBLIC_SUPPORT_EMAIL`
   - `NEXT_PUBLIC_SUPPORT_PHONE`
   - `NEXT_PUBLIC_BUSINESS_ADDRESS`
2. Deploy the website on a real HTTPS domain. Razorpay should be able to open `/`, `/assets`, `/privacy-policy`, `/terms-and-conditions`, `/cancellation-refund-policy`, `/shipping-delivery-policy`, and `/contact` without login.
3. Confirm the footer links open Privacy Policy, Terms & Conditions, Cancellation & Refund Policy, Shipping/Delivery Policy, and Contact Us on the live domain.
4. Configure production Razorpay keys:
   - Backend: `RAZORPAY_KEY_ID`
   - Backend: `RAZORPAY_KEY_SECRET`
   - Frontend: `NEXT_PUBLIC_RAZORPAY_KEY_ID`
5. Confirm every paid product page shows product name, INR price, category, file size, version, description, requirements or installation notes, and digital download context before payment.
6. Test one paid checkout on the live site: create order, open Razorpay Checkout, complete payment, verify order status becomes `PAID`, and confirm download access works.
7. Confirm the Shipping/Delivery Policy states this is instant digital delivery, no physical shipping, and download/account access is provided after successful payment.
8. Confirm the Cancellation & Refund Policy states no refund after successful download, refund/replacement only for corrupted or inaccessible files or duplicate payment, and approved refunds are usually initiated within 5-7 business days.

## Security Checklist
- Use HTTPS everywhere.
- Restrict admin dashboard routes to staff users before exposing write actions.
- Keep paid asset files private and serve signed URLs.
- Enable database backups.
- Configure CORS for exact web and mobile origins.
- Add monitoring for failed payment verification and download abuse.
