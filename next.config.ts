import type { NextConfig } from "next";

const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://exemplo.supabase.co");

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: supabase.hostname, pathname: "/storage/v1/object/public/**" }] },
};

export default nextConfig;
