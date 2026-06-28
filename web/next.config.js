/** @type {import('next').NextConfig} */
const nextConfig = {
  // OS/Appliance mode needs a self-contained runtime (no node_modules at boot).
  output: "standalone",
  // Keep behavior deterministic in production images.
  poweredByHeader: false,
  // This app lives inside the monorepo; keep Turbopack rooted at web/.
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;

