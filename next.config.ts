import type { NextConfig } from "next";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  // Konva has an optional Node "canvas" dependency we never use in the browser.
  serverExternalPackages: ["konva", "canvas"],
  images: { unoptimized: true },
  // The dev-tools badge sits on top of the phone editor's tab bar; build errors still show in development.
  devIndicators: false,
  async headers() {
    return [
      // Family share and recording links must never show up in search results.
      { source: "/read/:path*", headers: noindex },
      { source: "/record/:path*", headers: noindex },
      { source: "/api/share/:path*", headers: noindex },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Microphone is used by the voice recorder on our own pages only.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
