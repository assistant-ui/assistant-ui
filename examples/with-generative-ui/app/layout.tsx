import type { Metadata } from "next";
import { GenerativeUIStyle } from "@/components/generative-ui-style";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui Generative UI Example",
  description:
    "Example showcasing model-composed interfaces with the present tool and a custom component vocabulary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GenerativeUIStyle />
      </head>
      <body className="h-dvh">{children}</body>
    </html>
  );
}
