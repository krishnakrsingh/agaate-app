import type { NextConfig } from "next";
const nextConfig: NextConfig = { poweredByHeader: false, serverExternalPackages: ["@prisma/client", "@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner"] };
export default nextConfig;
