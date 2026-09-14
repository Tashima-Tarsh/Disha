/** @type {import('next').NextConfig} */
const nextConfig = {
  // OS/Appliance mode needs a self-contained runtime (no node_modules at boot).
  output: "standalone",
  // OpenNext's file tracer can omit the workerd-conditioned pg-cloudflare
  // implementation used by node-postgres. Force those files into the traced
  // server bundle so Cloudflare Workers can resolve pg/lib/stream.js safely.
  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
    ],
  },
  // Keep behavior deterministic in production images.
  poweredByHeader: false,
  // This app lives inside the monorepo; keep Turbopack rooted at web/.
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
