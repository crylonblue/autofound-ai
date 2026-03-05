import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "autofound.ai — Build Autonomous Agents at Scale",
  description:
    "Create AI agents with custom skills, your own API keys, and isolated execution. The agent toolbox for developers and founders.",
  openGraph: {
    title: "autofound.ai — Build Autonomous Agents at Scale",
    description:
      "Create AI agents with custom skills, your own API keys, and isolated execution.",
    url: "https://autofound.ai",
    siteName: "autofound.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "autofound.ai — Build Autonomous Agents at Scale",
    description:
      "Create AI agents with custom skills, your own API keys, and isolated execution.",
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
