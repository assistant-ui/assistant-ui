import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mastra Integration Example",
  description: "Example using @assistant-ui/react-mastra with Mastra agents",
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