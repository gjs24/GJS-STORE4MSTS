import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(path.join(process.cwd(), ".."));

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || "319900561605-7j15m1bm7s3gm3fcbnoiibmgqi9jv9dv.apps.googleusercontent.com"
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" }
    ]
  }
};

export default nextConfig;
