import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mastra + assistant-ui",
  description: "Persistent Mastra chat and workflow resume with assistant-ui",
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
