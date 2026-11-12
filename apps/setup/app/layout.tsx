import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
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
  metadataBase: new URL("https://setup.assistant-ui.com"),
  title: { template: "%s · assistant-ui", default: "Setup · assistant-ui" },
  description: "Follow your coding agent as it sets up assistant-ui.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${publicSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
