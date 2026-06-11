# GitHub Upload Checklist

Use this checklist before pushing the project to GitHub.

## 1. Safe To Upload

These files and folders should be pushed:

```text
backend/
frontend/
mobile/
desktop/
.env.example
.gitignore
README.md
DEPLOYMENT.md
render.yaml
```

The full repo can be uploaded. You do not need to upload only `frontend`.

## 2. Do Not Upload Private Files

These must stay local or inside hosting dashboard environment variables:

```text
.env
.env.local
.env.production
backend/.env
frontend/.env.local
backend/db.sqlite3
backend/media/
backend/.venv/
frontend/.next/
frontend/node_modules/
```

Private values that must never be committed:

```text
RAZORPAY_KEY_SECRET
DATABASE_URL
DJANGO_SECRET_KEY
JWT_SECRET_KEY
CLOUDINARY_URL
AWS_SECRET_ACCESS_KEY
```

## 3. Public Values Are Okay

These are safe to show on the public website:

```text
NEXT_PUBLIC_RAZORPAY_KEY_ID
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_BUSINESS_NAME
NEXT_PUBLIC_SUPPORT_EMAIL
NEXT_PUBLIC_SUPPORT_PHONE
NEXT_PUBLIC_BUSINESS_ADDRESS
```

Anything starting with `NEXT_PUBLIC_` is visible in the browser.

## 4. Check Before Commit

Run:

```bash
git status --short
git ls-files .env backend/db.sqlite3 backend/media frontend/.next frontend/node_modules
```

The second command should print nothing.

## 5. First GitHub Push

Run these commands from the project root:

```bash
git add .
git status --short
git commit -m "Prepare store for Razorpay-ready deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

If `git remote add origin` says the remote already exists, use:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## 6. After GitHub Upload

Deploy:

```text
Vercel -> frontend/
Render -> backend/
```

Put real private values only in Render/Vercel environment variable settings, not in GitHub.
