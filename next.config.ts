import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Gzip/Brotli compression on all responses
  compress: true,
  // Remove X-Powered-By header (minor security + slightly smaller responses)
  poweredByHeader: false,
  // Strip console.* calls in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },
  images: {
    // Serve WebP/AVIF instead of PNG/JPEG where browser supports it
    formats: ["image/avif", "image/webp"],
    // Aggressively cache optimised images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Optimise package imports to reduce JS bundle size
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },
};

export default nextConfig;
