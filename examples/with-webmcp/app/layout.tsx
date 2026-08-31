import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebMCP Example",
  description:
    "Example exposing assistant-ui frontend tools to a WebMCP-capable browser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-dvh">{children}</body>
    </html>
  );
}
