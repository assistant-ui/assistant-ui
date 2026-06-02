import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "assistant-ui × Pi",
  description: "Pi coding-agent runtime adapter for assistant-ui",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-dvh">
      <body className="h-dvh overflow-hidden">{children}</body>
    </html>
  );
}
