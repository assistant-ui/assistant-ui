import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scroll initialize repro",
  description: "Temporary repro harness for assistant-ui issue #4009",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-dvh">
      <body className="h-dvh font-sans">{children}</body>
    </html>
  );
}
