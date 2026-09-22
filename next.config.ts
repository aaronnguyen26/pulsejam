import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/src-tauri/**', '**/build/**', '**/experiments/**', '**/test-assets/**'],
    };
    return config;
  },
};

export default nextConfig;
