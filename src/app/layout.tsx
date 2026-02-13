import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "autofound.ai — Build Your Company with AI Employees",
  description:
    "Hire AI agents, define org charts, and let them execute real work. Your first employees are AI.",
  openGraph: {
    title: "autofound.ai — Build Your Company with AI Employees",
    description:
      "Hire AI agents, define org charts, and let them execute real work.",
    url: "https://autofound.ai",
    siteName: "autofound.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "autofound.ai — Build Your Company with AI Employees",
    description: "Hire AI agents, define org charts, and let them execute real work.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
