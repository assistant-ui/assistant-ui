import "./global.css";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { Provider } from "./provider";

export const metadata = {
  title: {
    template: "%s | assistant-ui",
    default: "assistant-ui",
  },
  description: "The TypeScript/React library for AI Chat",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      {/* <head>
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head> */}
      <body className={"flex min-h-screen flex-col"}>
        <Provider>{children}</Provider>
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
