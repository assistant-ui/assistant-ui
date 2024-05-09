import React from "react";
import "./styles.css";
import type { AppProps } from "next/app";
import Head from "next/head";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon/favicon.svg"
        />
        <link rel="icon" type="image/png" href="/favicon/favicon.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
