import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Kalam, Patrick_Hand } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider/next";
import "./globals.css";

const kalam = Kalam({ weight: "700", subsets: ["latin"], variable: "--font-kalam", display: "swap" });
const patrick = Patrick_Hand({ weight: "400", subsets: ["latin"], variable: "--font-patrick", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mandate docs", template: "%s · Mandate docs" },
  description: "Bounded delegation for AI agents: a smart account with on-chain caps, an allow-list and a hardware guardian. SDK, AI tools, MCP server and contracts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${kalam.variable} ${patrick.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ enabled: false, forcedTheme: "light" }}>{children}</RootProvider>
      </body>
    </html>
  );
}
