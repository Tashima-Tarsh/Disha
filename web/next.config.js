/** @type {import('next').NextConfig} */
const nextConfig = {
  // OS/Appliance mode needs a self-contained runtime (no node_modules at boot).
  output: "standalone",
  // Keep behavior deterministic in production images.
  poweredByHeader: false,
};

module.exports = nextConfig;

