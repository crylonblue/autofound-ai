import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "autofound.ai — Company Formation on Autopilot",
  description:
    "Fully AI-powered company formation. No humans in the loop. Incorporate in the US, EU, or UK in minutes, not weeks.",
  openGraph: {
    title: "autofound.ai — Company Formation on Autopilot",
    description:
      "Fully AI-powered company formation. No humans in the loop. Incorporate in minutes.",
    url: "https://autofound.ai",
    siteName: "autofound.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "autofound.ai — Company Formation on Autopilot",
    description: "Fully AI-powered company formation. No humans in the loop.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
