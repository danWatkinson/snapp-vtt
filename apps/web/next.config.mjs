/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable default request logging since we have our own consistent logging middleware
  logging: {
    incomingRequests: false
  },
  // Rewrite /mock-assets/* to /api/mock-assets/* to serve test images
  async rewrites() {
    return [
      {
        source: "/mock-assets/:path*",
        destination: "/api/mock-assets/:path*"
      }
    ];
  }
};

export default nextConfig;


