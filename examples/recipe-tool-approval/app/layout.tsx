import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recipe: ask before running a tool",
  description:
    "A support agent that looks up orders on its own and asks before it refunds one.",
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
