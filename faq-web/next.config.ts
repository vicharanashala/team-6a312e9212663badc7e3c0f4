import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/admin/login",
        destination: "/login",
      },
    ];
  },
};

export default nextConfig;
