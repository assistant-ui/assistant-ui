import type { Metadata } from "next";
import "./globals.css";

import { GeistSans } from "geist/font/sans";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "assistant-ui",
  description: "Unstyled React components for chat and co-pilot UIs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <html lang="en">
        <body className={GeistSans.className}>{children}</body>
      </html>
    </TooltipProvider>
  );
}
