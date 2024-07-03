import { TooltipProvider } from "@/components/ui/tooltip";
import { Theme } from "@radix-ui/themes";
import type { AppProps } from "next/app";
import Head from "next/head";
import React from "react";

import "./styles.css";
import "@radix-ui/themes/styles.css";
import "@assistant-ui/react-ui/styles.css";
import "@assistant-ui/react-ui/markdown-styles.css";
import "@assistant-ui/react-ui/themes/default.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <TooltipProvider delayDuration={400}>
        <Head>
          <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
          <link rel="icon" type="image/png" href="/favicon/favicon.png" />
        </Head>
        <Theme>
          <Component {...pageProps} />
        </Theme>
      </TooltipProvider>

      <script
        defer
        src="/umami/script.js"
        data-website-id="6f07c001-46a2-411f-9241-4f7f5afb60ee"
        data-domains="www.assistant-ui.com"
      ></script>
    </>
  );
}
