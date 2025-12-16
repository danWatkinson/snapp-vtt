/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable default request logging since we have our own consistent logging middleware
  logging: {
    incomingRequests: false
  }
};

export default nextConfig;


