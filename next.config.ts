import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: {
    position: "top-right",
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
    ];
    return [{ source: "/:path*", headers: security }];
  },
  serverExternalPackages: ["@prisma/client", "@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"],
  allowedDevOrigins: [
    "10.18.27.172",
    "10.18.27.172:3000",
    "172.31.112.1",
    "172.31.112.1:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
