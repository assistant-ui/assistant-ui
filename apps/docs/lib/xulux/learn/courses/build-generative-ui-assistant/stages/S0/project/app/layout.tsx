import type { Metadata } from "@farm.js/core";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generative UI Assistant",
  description: "Built with assistant-ui.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
