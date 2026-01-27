import "@/styles/globals.css";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Provider } from "./provider";
import { cn } from "@/lib/utils";
import { BASE_URL } from "@/lib/constants";

const getMetadataBase = () => {
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
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
    template: "%s | assistant-ui",
    default: "assistant-ui",
  },
  description: "The TypeScript/React library for AI Chat",
  openGraph: {
    title: "assistant-ui",
    description: "The TypeScript/React library for AI Chat",
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
    description: "The TypeScript/React library for AI Chat",
    images: ["/api/og?variant=home"],
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        {/*<script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />*/}
      </head>
      <body
        className={cn(
          "flex min-h-screen flex-col antialiased",
          GeistSans.className,
          GeistMono.variable,
        )}
      >
        <Provider>{children}</Provider>
        <Analytics />
        <script
          defer
          src="/umami/script.js"
          data-website-id="6f07c001-46a2-411f-9241-4f7f5afb60ee"
          data-domains="www.assistant-ui.com"
        ></script>

        <Script
          id="vector-script"
          dangerouslySetInnerHTML={{
            __html: `
        !function(e,r){try{if(e.vector)return void console.log("Vector snippet included more than once.");var t={};t.q=t.q||[];for(var o=["load","identify","on"],n=function(e){return function(){var r=Array.prototype.slice.call(arguments);t.q.push([e,r])}},c=0;c<o.length;c++){var a=o[c];t[a]=n(a)}if(e.vector=t,!t.loaded){var i=r.createElement("script");i.type="text/javascript",i.async=!0,i.src="https://cdn.vector.co/pixel.js";var l=r.getElementsByTagName("script")[0];l.parentNode.insertBefore(i,l),t.loaded=!0}}catch(e){console.error("Error loading Vector:",e)}}(window,document);
        vector.load("d9af9bfb-c10c-4eed-9366-57cdc0a97ee9");
    `,
          }}
        />
      </body>
    </html>
  );
}
