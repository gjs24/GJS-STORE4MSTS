# 🚀 100% Free Cloud Deployment Guide: Render + Neon PostgreSQL

This guide takes you through deploying your Java Spring Boot backend for **free** in under 10 minutes.

---

## 🛠️ Requirements
- A free [GitHub](https://github.com) account.
- A free [Neon.tech](https://neon.tech) account (Serverless PostgreSQL).
- A free [Render.com](https://render.com) account.

---

## Step 1: Set Up Free Serverless PostgreSQL on Neon
1. Log in to [Neon.tech](https://neon.tech) and click **"Create Project"**.
2. Name the project `msts-store` and choose the region closest to India (e.g. `ap-southeast-1` Singapore).
3. Under **Dashboard**, look at the connection string details:
   - **Host**: e.g., `ep-quiet-star-12345.ap-southeast-1.aws.neon.tech`
   - **Database**: `neondb`
   - **User**: `neondb_owner`
   - **Password**: `YourPassword`
4. Form your JDBC URL:
   ```
   jdbc:postgresql://ep-quiet-star-12345.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Deploy to Render as Web Service
1. Log in to [Render.com](https://render.com) and click **"New +"** &rarr; **"Web Service"**.
2. Connect your GitHub repository `MSTS-GJS_PRODUCTION-STORE`.
3. Fill in the deployment details:
   - **Name**: `msts-spring-store`
   - **Region**: Singapore (or nearest)
   - **Branch**: `main`
   - **Root Directory**: `learn-java`
   - **Runtime**: `Docker`
   - **Docker Context**: `learn-java`
   - **Dockerfile Path**: `deploy/Dockerfile`
   - **Instance Type**: `Free`
4. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` |
   | `DATABASE_URL` | *(Your Neon JDBC URL from Step 1)* |
   | `DATABASE_USERNAME` | *(Your Neon user from Step 1)* |
   | `DATABASE_PASSWORD` | *(Your Neon password from Step 1)* |
   | `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` |
   | `CORS_ALLOWED_ORIGINS` | `https://gjs-store-4-msts.vercel.app,http://localhost:3000` |
5. Click **Create Web Service**.

---

## Step 3: Test and Verify
Render will build the Docker container and output logs in real-time. Once the status turns green ("Live"):
1. Test Health: `https://msts-spring-store.onrender.com/api/v1/health`
2. Test Assets: `https://msts-spring-store.onrender.com/api/v1/assets`
3. Test Swagger Docs: `https://msts-spring-store.onrender.com/swagger-ui.html`

You now have a 100% free, production-ready Java backend running in the cloud!

