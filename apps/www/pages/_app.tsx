import React from "react";
import "./styles.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <TooltipProvider delayDuration={400}>
        <Head>
          <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
          <link rel="icon" type="image/png" href="/favicon/favicon.png" />
        </Head>
        <Component {...pageProps} />
      </TooltipProvider>
    </>
  );
}
