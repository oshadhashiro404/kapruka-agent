import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.kapruka.com", pathname: "/**" },
      { protocol: "https", hostname: "kapruka.com", pathname: "/**" },
      { protocol: "https", hostname: "*.kapruka.com", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
