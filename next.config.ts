import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./security-headers.mjs";

const nextConfig: NextConfig = {
  async headers() {
    // dev mode needs eval for hot reloading, so only enforce in production builds
    return process.env.NODE_ENV === "production" ? [{ source: "/:path*", headers: SECURITY_HEADERS }] : [];
  },
  // Cache Components / Partial Prefetching are off: the app's pages are client-rendered
  // (profiles live in the browser or Supabase), and Cloudflare Workers can't run them reliably.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
