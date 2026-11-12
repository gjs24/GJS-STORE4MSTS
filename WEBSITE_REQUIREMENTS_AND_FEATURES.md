# Website Requirements & Feature Specification
**Project:** MSTS-GJS Production Store (Digital Railway Simulation Asset Marketplace)  
**Target Domain:** Microsoft Train Simulator (MSTS) & Open Rails Add-ons Store  
**Currency:** Indian Rupees (`INR ₹`)  

---

## 1. Project Overview & Goals
Build a full-stack e-commerce web platform for selling and distributing digital railway simulation add-ons (locomotives, trainsets, coaches, routes, cab views, custom horn/sound packs, textures, and custom destination nameboards) for **MSTS** and **Open Rails**.

The platform must support:
- **Free & Paid digital asset distribution** priced in INR (`₹`).
- **Secure gated downloads** (preventing unauthorized link sharing or scraping).
- **Rich product lifecycle controls** (Coming Soon, Pre-Booking, VIP Early Access, Flash Deals, Festival Pricing Schedules, Paid Updates, Feature Add-on Bundles, and Distribution Pause/Stop).
- **Interactive Railway Nameboard Designer ("Board Studio")** integrated with store purchases.
- **Full Admin Dashboard** for managing catalog, orders, payments, users, promotions, maintenance mode, and analytics.

---

## 2. Brand Aesthetic, UI/UX & Theme Requirements
- **Visual Identity:** Indian Railways / industrial dark-mode default (`dark` theme primary, with a user-selectable `light`/`dark` theme toggle persisted in `localStorage`).
- **Typography & Layout:** Crisp condensed headers (`Chakra Petch`, `Roboto Condensed`, `Share Tech Mono`, plus regional script support for Indian railway nameboards such as Hindi/Devanagari & Tamil), responsive mobile-first grid, smooth Framer Motion transitions.
- **Global Storefront Chrome:**
  - **Top Live Activity Ticker:** Social-proof scrolling bar showing recent community activity / popular packs.
  - **Festival / Offer Announcement Bar:** Dismissible top bar triggered during active promotions or festivals.
  - **Floating Support Widgets:** Direct WhatsApp Support chat button and "Join WhatsApp Group" quick-join pill (configurable via environment/settings).
  - **Entrance Promo Popup:** Configurable welcome/offer modal shown on entry.
  - **Festival Visual Effects Layer:** Optional celebratory overlays (`fireworks`, `skyshots`, `confetti`, `sparkles`, `snow`, `diyas`, or banner-only).
  - **Maintenance Mode Guard:** Site-wide maintenance screen with estimated return time and an admin-bypass token verification endpoint.

---

## 3. Recommended Tech Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion, Recharts (admin analytics), `react-markdown` + `remark-gfm` (product descriptions & driver manuals).
- **Backend API:** Django + Django REST Framework (DRF) + SimpleJWT (JWT access & refresh authentication).
- **Database:** PostgreSQL (production) / SQLite (local dev).
- **Payments:** Cashfree Payments (primary), Razorpay (secondary/optional), plus Manual UPI/UTR verification support.
- **File & Media Storage:**
  - Product thumbnails & gallery images: Cloudinary (or S3/CDN).
  - Protected downloadable archives (`.zip`, `.rar`, `.7z`): Private S3/R2 bucket (pre-signed time-limited URLs), Google Drive API (per-buyer email permission granting on restricted files), or authenticated fallback stream.
- **PDF Invoices:** Server-side PDF generation (e.g., `reportlab`).
- **Optional Desktop Companion:** Windows Electron wrapper (`GJS RailForge Launcher` / Desktop Store App) with offline/reconnect screen and persistent login.

---

## 4. Public Storefront Pages & Customer Features

### 4.1 Home Page (`/`)
- **Hero Section:** Brand tagline, merchant details, primary CTAs, and configurable **Hero Image Slideshow**.
- **Community Stats Bar:** Live store totals (assets, downloads, addons, etc.).
- **Trust Pillars:** Highlights instant delivery, tested Open Rails/MSTS compatibility, INR payments, and WhatsApp support.
- **Featured Assets, Top Downloaded, & Upcoming Releases** carousels/grids.
- **Category Quick-Browse Grid** with custom icons per asset type.

### 4.2 Marketplace Catalog (`/assets` & `/categories`)
- Search by keyword.
- Filter by **Category** (Trains, Routes, Sounds, Cab Views, Textures, Free Downloads, Premium Downloads, etc.), **Simulator Compatibility** (`MSTS`, `OPEN_RAILS`, `BOTH`), **Free vs Paid**, **Active Deals**, and **Upcoming / Coming Soon**.
- Sort by latest, featured, most downloaded, or price.
- **Asset Card Badges:** Simulator compatibility, version, download count, discount/festival price strike-through, Pre-Booking / Early Access / Coming Soon / Distribution Stopped badges, and Wishlist heart toggle.

### 4.3 Product Detail Page (`/assets/[slug]`)
- **Media Gallery:** Full-width preview carousel with thumbnail selector & fullscreen lightbox.
- **Sticky Purchase & Action Sidebar:**
  - Short description + quick scroll links to Features & Operations Manual.
  - Dynamic pricing display (Base Price, Original Price, Active Deal countdown timer, Festival Price, Pre-Booking Price, Early Access discount).
  - **Bundle vs Separate Option:** If linked to Feature Add-ons or a paid Board Template, allow choosing Base vs Complete Bundle.
  - **Smart Action Button** based on user & product state:
    - *Unpurchased:* Buy Now (opens checkout/payment gateway) or Claim Free.
    - *Upcoming:* "Notify Me" email capture form + release countdown.
    - *Pre-Booking Open:* Pre-book slot counter, discounted pre-book price, and scheduled download unlock countdown (`prebooking_download_unlock_at`).
    - *Paid Update Required:* Existing base owners see "Unlock Update (₹X)" while post-update buyers get it automatically.
    - *Distribution Stopped:* Pauses new purchases with custom reason/message (and optionally pauses downloads for existing owners).
    - *Owned / Unlocked:* One-click **Download** button.
- **Tabbed Specifications & Documentation Section:**
  1. **Product Overview & Features:** Full Markdown description.
  2. **Operations Manual & Controls:**
     - Direct 1-click button to external/PDF User Manual (`manual_url`).
     - Custom Markdown Driver Guide (`manual_content`).
     - Locomotive configuration guide & **MSTS / Open Rails Keyboard Hotkey Cheat Sheet** (Traction, Air/Dynamic Brakes, Doors/Wipers, Lights/Horn/VCD, Camera views).
  3. **Trailer & Gameplay:** Privacy-enhanced YouTube embed (`youtube-nocookie.com`).
  4. **System Requirements:** Simulator requirements breakdown.
  5. **Installation Guide:** Step-by-step setup with one-click copy for `MSTS\TRAINS\TRAINSET`.
  6. **Changelog & Updates:** Version history timeline (`UpdateLog`).
- **Feature Add-ons Panel:** Display optional upgrade packs (`AssetFeatureAddon`) showing "Upgrade for ₹X" for base owners or bundled purchase for new buyers.
- **Customer Reviews & Ratings:** Verified buyers can leave 1–5 star ratings and text reviews (moderated/approved by admin).

### 4.4 Legal, Compliance & Info Pages
Required for Indian payment gateway (Cashfree/Razorpay) approval:
- `/privacy-policy`
- `/terms-and-conditions`
- `/cancellation-refund-policy`
- `/shipping-delivery-policy` (explaining instant digital delivery)
- `/contact` (Business name, legal merchant name, address, support email, phone/WhatsApp)
- `/download-app` (Windows Desktop App landing & installer download page, toggleable in Site Settings)

---

## 5. Interactive Railway Board Studio (`/board-studio` & `/custom-boards`)
A built-in browser-based custom texture/nameboard generator tailored for MSTS/Open Rails rolling stock:
- **Template Store & My Templates:** Browse Free and Paid `BoardTemplate` items (LED matrix boards, coach boards, train nameboards).
- **Interactive Editor:**
  - Configurable canvas dimensions (e.g., `1024x1024`), background artwork, fixed graphics (borders, bolts, Indian Railways crests), editable multi-language text slots (English, Hindi, Tamil, etc.), style variations, and quick train presets.
  - Export output matching the required 3D model texture filename (`target_texture_name`, e.g., `VB_NAME.dds` / `.png`, optionally user-renamable).
- **Monetization & Bundling:**
  - Paid board templates can be bought standalone inside Board Studio **or** bundled free when a user buys a linked trainset asset (`bundle_board_template_free`).
  - Users can save customized boards (`UserCustomBoard`) to their account (`/custom-boards`) and re-edit them anytime.

---

## 6. Authentication & Customer Dashboard

### 6.1 Auth Flows (`/login`, `/register`, `/forgot-password`)
- Standard **Username/Email + Password** registration & login.
- **Google OAuth Sign-In** (`@react-oauth/google` + backend Google ID token verification).
- **Email OTP Verification & Password Reset:** 6-digit time-limited OTP with max retry limit (`5` attempts) and rate limiting.
- **Profile Phone Number:** Collected for payment gateway checkout (10-digit mobile number) and invoices.

### 6.2 Customer Dashboard (`/dashboard/...`)
- **Overview (`/dashboard`):** Account summary, quick stats, and special access badge (if VIP).
- **My Purchases (`/dashboard/purchases`):** List of all bought assets, feature add-ons, paid updates, and board templates, with:
  - Direct **Download** button (including add-on downloads).
  - Direct **Manual & Controls** jump link.
  - **Download PDF Invoice** button.
  - Payment retry/verify action if an order is pending.
- **Download History (`/dashboard/downloads`):** Log of past downloads with timestamps.
- **Profile Settings (`/dashboard/profile`):** Update profile/phone details.
- **Wishlist (`/wishlist`):** Save/remove favorite assets.
- **Special Access Claim (`/special-access`):** Redeem VIP invite links (`SpecialAccessInviteLink`) via `?token=...` (either instant auto-grant or request awaiting admin approval).

---

## 7. Checkout, Payments & Digital Delivery Logic

### 7.1 Order & Payment Processing
- Support multiple order types: `BASE`, `UPGRADE` (feature add-on or paid version update), and `BUNDLE` (base + add-ons).
- **Database uniqueness constraints** to prevent accidental duplicate paid orders for the same user + item.
- **Server-side Price Calculation:** Never trust prices sent from the frontend—calculate final INR amount on the backend (applying active Deal, Pre-Booking, Early Access discount, or active Festival price).
- **Cashfree & Razorpay Integration:**
  - Create payment session/order on backend -> open Cashfree/Razorpay checkout on frontend -> verify status server-side via payment gateway API + asynchronous **Webhook handlers** (with cryptographic HMAC signature verification and idempotent processing).
- **Manual UPI / UTR Support (optional fallback):** Allow submitting transaction UTR & payer name for `VERIFICATION_PENDING` manual admin approval.
- **Order Lifecycle Statuses:** `PENDING`, `VERIFICATION_PENDING`, `APPROVED`, `REJECTED`, `PAID`, `FAILED`, `EXPIRED`, `REFUNDED`, `BLOCKED`.

### 7.2 Secure Download Delivery Priority
When an authenticated user requests `/assets/<id>/download/` or `/addons/<id>/download/`, verify eligibility (`is_staff`, `is_free` + not stopped, active `UserSpecialAccess`, or valid `PAID`/`APPROVED` non-blocked order + paid update check + pre-booking unlock check), log the download (`DownloadLog` with IP & user-agent, increment `download_count`), and serve via priority order:
1. **Private S3 / Cloudflare R2 Object Key:** Generate short-lived pre-signed GET URL (`create_private_download_url`).
2. **Restricted Google Drive File ID:** Keep Drive files **Restricted** (not public). Use a Google Cloud Service Account (`Editor` on file) to programmatically add `reader` permission for the buyer's verified account email (`grant_google_drive_access`), then return the Drive view link.
3. **External / Cloudinary URL** or **Direct File Stream**.

---

## 8. Admin Dashboard (`/admin-dashboard/...`)
Accessible only to authenticated staff/superusers (`/admin-login` + `IsAdminUser`):
1. **Analytics Overview (`/admin-dashboard`):** Total revenue, total orders, total users, downloads count, Recharts graphs (Monthly Revenue, Sales Overview, Downloads Analytics, Orders Donut), Latest Orders, Recent Users, Top Downloaded Assets, and Quick Actions.
2. **Products Management (`/admin-dashboard/assets`, `/create`, `/[id]/edit`):**
   - Full CRUD for assets, thumbnails, multi-image gallery, YouTube video URL, Markdown description, `manual_url`, `manual_content`, requirements, installation steps, changelog.
   - Pricing & lifecycle switches: Deal timer, Coming Soon banner, Pre-Booking (slots, price, unlock date/time), VIP Early Access (required prior assets, discount %), Paid Version Update (version, price, release notes), Board Template bundling, Festival override price, and **1-click Distribution Stop/Resume**.
   - Upload/link secure download source (Private S3/R2 key, Restricted Google Drive File ID, Cloudinary URL, or direct `.zip`).
   - View per-asset "Notify Me" subscribers and recent download logs.
3. **Festival Themes & Scheduler (`/admin-dashboard/festival-themes`):**
   - Manage `FestivalSchedule` records with start/end date-time windows, priority (highest priority wins when overlapping), theme style (`ANNIVERSARY`, `DIWALI`, `PONGAL`, `CHRISTMAS`, `NEW_YEAR`, `INDEPENDENCE_DAY`, `CUSTOM`), visual effect, announcement bar/popup toggles, storewide `%` discount, or per-product custom `FestivalAssetPrice` table.
4. **Orders & Payments (`/admin-dashboard/orders`):** Search/filter orders, approve/reject manual UTR payments, **Block / Revoke** download access (`BLOCKED` with reason), and inspect payment logs.
5. **Users & Special Access (`/admin-dashboard/users`):**
   - View users, promote/deactivate accounts, grant `UserSpecialAccess` (All-Access Free Pass or specific assets/board templates with optional expiration + customizable email announcement).
   - Create & manage `SpecialAccessInviteLink` tokens (max uses, expiry, `APPROVAL` vs `AUTO_GRANT` mode) and approve/reject `SpecialAccessClaimRequest` submissions.
6. **Board Templates Manager (`/admin-dashboard/board-templates`):** Manage Board Studio templates, pricing, JSON slots/graphics/variations/presets, and target export filenames.
7. **Reviews Moderation (`/admin-dashboard/reviews`):** Approve, hide, or delete customer reviews.
8. **Logs & Settings:**
   - **Categories** management.
   - **Downloads Log** (`/admin-dashboard/downloads`) & **Notify Me Requests**.
   - **Admin Activity Audit Log** (`/admin-dashboard/activity-logs`).
   - **Site Settings** (`/admin-dashboard/settings`): Hero image & slideshow URLs, entrance popup, top scroller message, Maintenance Mode + bypass token, Desktop App enable/version/URL, Board Studio toggle, and Special Access email templates.

---

## 9. Non-Functional & High-Level Security Requirements
- **Zero Secret/Source Exposure in Public APIs:** Never include `google_drive_file_id`, `private_download_key`, `external_download_url`, `download_file` paths, or `maintenance_bypass_token` in public product/settings API payloads—only expose a boolean `has_download_file`.
- **PII Protection:** Public review endpoints must never expose customer emails, phone numbers, or user IDs (display safe username/display name only).
- **Strict Access Control:** All `/admin/...` endpoints require `IsAdminUser`; user-owned endpoints (orders, invoices, custom boards, wishlist) must enforce object-level ownership checks (`user == request.user`).
- **Webhook & Payment Security:** Verify Cashfree/Razorpay webhook signatures using HMAC (`hmac.compare_digest`), validate payload schemas, and enforce idempotency.
- **Brute-Force & Abuse Protection:** DRF rate limiting (`AnonRateThrottle`, `UserRateThrottle`, dedicated auth/OTP/download throttles), OTP attempt lockouts, and constant-time comparison for secret tokens.
- **Input & Upload Sanitization:** Validate safe `http`/`https` schemes on user/admin-rendered URLs (block `javascript:` / unsafe `data:` URIs), sanitize SVG/HTML inputs, validate image uploads server-side with Pillow, and restrict file extensions (`.zip`, `.rar`, `.7z`).
- **Hardened HTTP & Desktop Security:** Enable HTTPS/HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict CORS/CSRF origin whitelists, and Electron `contextIsolation: true` / `nodeIntegration: false` (if building the desktop app).
