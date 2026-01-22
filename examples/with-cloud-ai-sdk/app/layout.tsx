import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud AI SDK Example",
  description: "Example using assistant-cloud with AI SDK v6",
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
