import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@trigger.dev/sdk", "fluent-ffmpeg"],
};

export default nextConfig;
