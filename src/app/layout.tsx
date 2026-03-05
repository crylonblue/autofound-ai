import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "autofound.ai — Your AI Workforce That Never Sleeps",
  description:
    "Hire AI agents that handle marketing, research, sales, and operations 24/7. No coding required.",
  openGraph: {
    title: "autofound.ai — Your AI Workforce That Never Sleeps",
    description:
      "Hire AI agents that handle marketing, research, sales, and operations 24/7. No coding required.",
    url: "https://autofound.ai",
    siteName: "autofound.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "autofound.ai — Your AI Workforce That Never Sleeps",
    description:
      "Hire AI agents that handle marketing, research, sales, and operations 24/7. No coding required.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </Providers>
        <Toaster richColors position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
