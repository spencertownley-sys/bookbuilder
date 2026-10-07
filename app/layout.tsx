import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GOOGLE_FONTS_HREF } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bookling — make a children's book in minutes",
  description: "Drag, drop and pose characters, add your words, and print or publish a real picture book.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

// The "unique login" look: Clerk's components pick up the Bookling palette and fonts.
const appearance = {
  variables: {
    colorPrimary: "#7C4DFF",
    colorForeground: "#2A363B",
    colorBackground: "#FFFFFF",
    fontFamily: "Quicksand, system-ui, sans-serif",
    fontFamilyButtons: "Fredoka, Quicksand, sans-serif",
    borderRadius: "14px",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider appearance={appearance}>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
