import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chain of Thought Example",
  description: "Example using ChainOfThoughtPrimitive with AI SDK",
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
