import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Generation Example",
  description: "Example using @assistant-ui/react image generation primitives",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground h-dvh">{children}</body>
    </html>
  );
}
