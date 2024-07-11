import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Body } from "./layout.client";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <Body>
        <RootProvider>{children}</RootProvider>
        <script
          defer
          src="/umami/script.js"
          data-website-id="6f07c001-46a2-411f-9241-4f7f5afb60ee"
          data-domains="www.assistant-ui.com"
        ></script>
      </Body>
    </html>
  );
}
