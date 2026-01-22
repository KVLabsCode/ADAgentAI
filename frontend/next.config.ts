import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
    // Serve modern image formats for better performance
    formats: ["image/avif", "image/webp"],
  },

  // React Compiler for automatic memoization optimization
  // Reduces unnecessary re-renders with zero manual code changes
  reactCompiler: true,

  // Cache Components for Partial Prerendering (PPR)
  // Allows mixing static and dynamic content in the same route
  cacheComponents: true,

  // Next.js 16 experimental features
  experimental: {
    // Client-side Router Cache settings to prevent unnecessary re-fetches
    staleTimes: {
      dynamic: 30, // Cache dynamic routes for 30 seconds
      static: 180, // Cache static routes for 3 minutes
    },
    // Optimize barrel file imports for faster builds and reduced bundle size
    // Transforms `import { X } from 'lucide-react'` to direct imports
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
