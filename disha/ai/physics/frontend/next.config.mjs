/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["apod.nasa.gov"],
  },
  env: {
    NEXT_PUBLIC_QUANTUM_API_URL: process.env.NEXT_PUBLIC_QUANTUM_API_URL || "http://localhost:8002",
  },
};

export default nextConfig;
