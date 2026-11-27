import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recipe: show a tool result as your own component",
  description:
    "A chat that answers weather questions with a weather card instead of text.",
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
