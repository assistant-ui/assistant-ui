import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui WebMCP Example",
  description:
    "Example exposing the app's frontend tools to browser agents over WebMCP with a user approval gate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/*
          Origin trial route (Chrome 149+): register your origin for the
          "WebMCP" trial and place the token here — see README.md.

          <meta httpEquiv="origin-trial" content="YOUR_ORIGIN_TRIAL_TOKEN" />
        */}
      </head>
      <body className="h-dvh">{children}</body>
    </html>
  );
}
