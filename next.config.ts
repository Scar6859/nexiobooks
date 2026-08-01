import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid corrupted webpack pack files on Windows during hot reload.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
