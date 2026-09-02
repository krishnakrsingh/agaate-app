import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
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
