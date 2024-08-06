import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata = {
  title: {
    template: "%s | assistant-ui",
    default: "assistant-ui",
  },
  description: "Build in-app AI chatbots in days, not weeks.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className={"flex min-h-screen flex-col"}>
        <RootProvider>{children}</RootProvider>
        <script
          defer
          src="/umami/script.js"
          data-website-id="6f07c001-46a2-411f-9241-4f7f5afb60ee"
          data-domains="www.assistant-ui.com"
        ></script>
      </body>
    </html>
  );
}
