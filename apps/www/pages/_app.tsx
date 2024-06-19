import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppProps } from "next/app";
import Head from "next/head";
import React from "react";

import "./styles.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";

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
    </>
  );
}
