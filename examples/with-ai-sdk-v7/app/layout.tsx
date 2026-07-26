import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI SDK v7 Example",
  description: "Example using @assistant-ui/react with AI SDK v7",
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
