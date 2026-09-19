# 🌐 End-to-End Hosting & Production Deployment Guide: Java Full-Stack

This guide covers all methods to deploy your Spring Boot 3 Java backend and connect it with your Next.js frontend, from 100% free cloud tiers to dedicated production VPS servers.

---

## 🗺️ Deployment Strategies Overview

| Strategy | Cost | Best For | Tech Stack |
|---|---|---|---|
| **Strategy A: Free Cloud Tier** | **$0 / month** | Learning, demoing, portfolios | Render (Web Service) + Neon (Serverless Postgres) + Vercel (Next.js) |
| **Strategy B: Production VPS** | **$4 - $6 / month** | Live MSTS Store with real users | Ubuntu VPS (Hetzner / DigitalOcean) + Docker Compose + Nginx + Free SSL |
| **Strategy C: Managed Cloud (AWS/Railway)**| **$15 - $30 / month**| Enterprise scaling & zero server maintenance | AWS App Runner / Railway + Managed Postgres |

---

## 🟢 Strategy A: 100% Free Cloud Deployment (Render + Neon)

This is the fastest, completely free way to host your Java Spring Boot backend online with HTTPS and a managed PostgreSQL database.

### Step 1: Create Free PostgreSQL Database on Neon
1. Go to [Neon.tech](https://neon.tech) and sign up with GitHub.
2. Click **"New Project"**, name it `msts-store-db`.
3. Under Dashboard, copy your connection string:
   ```
   postgresql://msts_user:secretpass@ep-cool-fog.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Note your credentials:
   - Host: `ep-cool-fog.us-east-2.aws.neon.tech`
   - Database: `neondb`
   - Username: `msts_user`
   - Password: `secretpass`

### Step 2: Push Spring Boot App to GitHub
Ensure `learn-java/backend-spring` is pushed to your GitHub repository.

### Step 3: Deploy to Render as Web Service
1. Go to [Render.com](https://render.com) and create a free account.
2. Click **New +** &rarr; **Web Service**.
3. Connect your GitHub repository.
4. Set the following build settings:
   - **Root Directory**: `learn-java/backend-spring`
   - **Runtime**: `Docker` (Render will use the included `Dockerfile`) or `Java`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   ```env
   SPRING_PROFILES_ACTIVE=prod
   DATABASE_URL=jdbc:postgresql://ep-cool-fog.us-east-2.aws.neon.tech/neondb?sslmode=require
   DATABASE_USERNAME=msts_user
   DATABASE_PASSWORD=secretpass
   JWT_SECRET=YourUltraSuperSecretKeyForSigningJwtsAtLeast32BytesLong12345
   CASHFREE_APP_ID=your_cashfree_app_id
   CASHFREE_SECRET_KEY=your_cashfree_secret_key
   CORS_ALLOWED_ORIGINS=https://gjs-store-4-msts.vercel.app,http://localhost:3000
   ```
6. Click **Deploy Web Service**.
7. Render will build the Docker container and provide a live HTTPS URL:
   `https://msts-spring-store.onrender.com`
8. Verify it works by opening `https://msts-spring-store.onrender.com/swagger-ui.html` or `/api/v1/health`!

---

## 🔵 Strategy B: Production VPS Deployment (Docker Compose + Nginx + Free SSL)

When you are ready for maximum speed, no cold starts, and 100% control over your server, deploy to a Linux VPS (e.g. Hetzner Cloud ₹350/mo or DigitalOcean ₹450/mo).

### Server Architecture on VPS:
```
Internet (Port 80/443) 
       │
       ▼
[Nginx Reverse Proxy]  ── (SSL via Certbot Let's Encrypt)
       │
       ├── /api/*  ──────► Forward to localhost:8080 (Spring Boot Docker)
       │
       └── /*      ──────► Forward to localhost:3000 (Next.js Node Docker)
                               │
                               ▼
                    [PostgreSQL 16 Container] (Internal network)
```

### Step 1: Provision an Ubuntu 22.04 / 24.04 Server
Connect via SSH:
```bash
ssh root@your_server_ip
```

### Step 2: Run the 1-Click Setup Script
We have provided an automated script in `learn-java/deploy/deploy-vps.sh`. Or run manually:
```bash
# 1. Update system & install Docker
apt-get update && apt-get upgrade -y
apt-get install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx git ufw

# 2. Configure Firewall (UFW)
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 3. Clone your repo
git clone https://github.com/gjs24/MSTS-GJS_PRODUCTION-STORE.git /opt/msts-store
cd /opt/msts-store/learn-java/deploy
```

### Step 3: Launch Containers with Docker Compose
```bash
# Start Spring Boot, PostgreSQL, and Adminer in background
docker compose up -d --build
```
Check status:
```bash
docker compose ps
docker compose logs -f spring-boot
```

### Step 4: Configure Nginx & SSL Certificate
Copy `learn-java/deploy/nginx.conf` to `/etc/nginx/sites-available/msts-store`:
```bash
cp nginx.conf /etc/nginx/sites-available/msts-store
ln -s /etc/nginx/sites-available/msts-store /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Obtain a free SSL certificate from Let's Encrypt:
```bash
certbot --nginx -d api.yourdomain.com
```

Your Spring Boot API is now live with enterprise SSL, automatic restarts, and zero maintenance!

---

## ⚡ Production JVM Tuning & Best Practices

Running Java in containers requires smart memory configuration so it uses minimal RAM while running super fast:

### 1. JVM Container Memory Flags
In `Dockerfile`, we configure:
```bash
ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-XX:+UseG1GC", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
```
- `-XX:+UseContainerSupport`: Tells the JVM to detect Docker container RAM limits rather than host hardware.
- `-XX:MaxRAMPercentage=75.0`: Keeps heap memory within 75% of container RAM, preventing Out-Of-Memory (OOM) kills.
- `-XX:+UseG1GC`: Low-latency garbage collector optimal for REST APIs.

### 2. Connection Pooling with HikariCP
Spring Boot 3 uses HikariCP by default. In `application.yml`:
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 3
      idle-timeout: 300000
      max-lifetime: 1800000
      connection-timeout: 20000
```
This ensures your database connections are reused efficiently without overloading PostgreSQL.

---

## 🤖 Continuous Integration & Continuous Deployment (CI/CD)

Whenever you push code to GitHub `main` branch, GitHub Actions will automatically:
1. Run `mvn clean verify` with JDK 21.
2. Build the optimized Docker image.
3. Push to GitHub Container Registry (GHCR) or DockerHub.
4. Trigger your VPS to pull the latest image and restart with zero downtime!

See `.github/workflows/ci-cd.yml` in `learn-java/deploy/github-ci-cd.yml` for the complete workflow.

