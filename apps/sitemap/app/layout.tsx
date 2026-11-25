import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { galleryStagingCss } from "@/components/gallery/gallery-staging";
import { GenerativeUIStyle } from "@/components/generative-ui-style";
import { TokenPanel } from "@/components/dev/token-panel";
import { SkipLink } from "@/components/shared/skip-link";
import { Providers } from "./providers";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s · assistant-ui",
    default: "assistant-ui · The frontend library for AI agents",
  },
  description:
    "Open-source React components and runtimes for building AI chat. Streaming, tools, and persistence in TypeScript.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // The font variables sit on <html> because the theme's --font-* tokens
      // resolve on :root.
      className={`${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <GenerativeUIStyle />
        <style>{galleryStagingCss}</style>
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SkipLink />
        <Providers>
          {children}
          {process.env.NODE_ENV === "development" ? <TokenPanel /> : null}
        </Providers>
      </body>
    </html>
  );
}
