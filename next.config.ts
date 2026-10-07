import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Konva has an optional Node "canvas" dependency we never use in the browser.
  serverExternalPackages: ["konva", "canvas"],
  images: { unoptimized: true },
};

export default nextConfig;
