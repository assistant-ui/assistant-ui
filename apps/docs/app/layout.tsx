import "@/styles/globals.css";
import type { ReactNode } from "react";
import { JetBrains_Mono, Public_Sans } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Provider } from "./provider";
import { SiteAssistant } from "@/components/pages/docs/assistant/site-assistant";
import { cn } from "@/lib/utils";
import { BASE_URL } from "@/lib/constants";
import { GenerativeUIStyle } from "@/components/generative-ui-style";
import { galleryStagingCss } from "@/components/gallery/gallery-staging";
import { umamiBootstrapScript } from "@/lib/umami-sampling";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const getMetadataBase = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return new URL(appUrl);
  }

  if (process.env.NODE_ENV === "production") {
    return new URL(BASE_URL);
  }
  return new URL("http://localhost:3000");
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  metadataBase: getMetadataBase(),
  title: {
    template: "%s · assistant-ui",
    default: "assistant-ui · The frontend library for AI agents",
  },
  description:
    "Open-source React components and runtimes for building AI chat. Streaming, tools, and persistence in TypeScript.",
  openGraph: {
    title: "assistant-ui",
    description:
      "Open-source React components and runtimes for building AI chat. Streaming, tools, and persistence in TypeScript.",
    siteName: "assistant-ui",
    type: "website",
    images: [
      {
        url: "/api/og?variant=home",
        width: 1200,
        height: 630,
        alt: "assistant-ui",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "assistant-ui",
    description:
      "Open-source React components and runtimes for building AI chat. Streaming, tools, and persistence in TypeScript.",
    images: ["/api/og?variant=home"],
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <GenerativeUIStyle />
        <style>{galleryStagingCss}</style>
        <script dangerouslySetInnerHTML={{ __html: umamiBootstrapScript }} />
        <Script
          id="vector-script"
          dangerouslySetInnerHTML={{
            __html: `
        !function(e,r){try{if(e.vector)return void console.log("Vector snippet included more than once.");var t={};t.q=t.q||[];for(var o=["load","identify","on"],n=function(e){return function(){var r=Array.prototype.slice.call(arguments);t.q.push([e,r])}},c=0;c<o.length;c++){var a=o[c];t[a]=n(a)}if(e.vector=t,!t.loaded){var i=r.createElement("script");i.type="text/javascript",i.async=!0,i.src="https://cdn.vector.co/pixel.js";var l=r.getElementsByTagName("script")[0];l.parentNode.insertBefore(i,l),t.loaded=!0}}catch(e){console.error("Error loading Vector:",e)}}(window,document);
        vector.load("d9af9bfb-c10c-4eed-9366-57cdc0a97ee9");
    `,
          }}
        />
      </head>
      <body
        className={cn(
          "flex min-h-screen flex-col font-sans antialiased",
          publicSans.variable,
          jetbrainsMono.variable,
        )}
      >
        <div aria-hidden="true" className="sr-only">
          For AI agents: a documentation index is available at{" "}
          <a href="/llms.txt" tabIndex={-1}>
            llms.txt
          </a>
          . Use .md for canonical markdown pages; .mdx is kept as a
          backwards-compatible alias on supported URL paths.
        </div>
        <Provider>
          <SiteAssistant>{children}</SiteAssistant>
        </Provider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
