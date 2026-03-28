/** @type {import('next').NextConfig} */
const backend =
  process.env.BACKEND_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  /** Proxy API to FastAPI so the browser calls same-origin `/api/v1/...` (avoids CORS on `localhost:3000` → `localhost:8000`). */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
