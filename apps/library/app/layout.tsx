import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import { galleryStagingCss } from "@/components/gallery/gallery-staging";
import { GenerativeUIStyle } from "@/components/generative-ui-style";
import { LibraryProvider } from "@/components/library/library-context";
import { LibraryShell } from "@/components/library/library-shell";
import { SkipLink } from "@/components/shared/skip-link";
import { getLibraryItems } from "@/lib/library/items";
import { Providers } from "./providers";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const description =
  "Components, blocks, themes, starters, runtimes, integrations, tools, utilities, and skills for assistant-ui, each with an install command or agent prompt.";

export const metadata: Metadata = {
  title: { template: "%s · assistant-ui", default: "Library · assistant-ui" },
  description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GenerativeUIStyle />
        <style>{galleryStagingCss}</style>
      </head>
      <body
        className={`${publicSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <SkipLink />
        <Providers>
          <LibraryProvider items={getLibraryItems()}>
            <div className="h-svh">
              <LibraryShell>{children}</LibraryShell>
            </div>
          </LibraryProvider>
        </Providers>
      </body>
    </html>
  );
}
