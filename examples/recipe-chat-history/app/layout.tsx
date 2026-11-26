import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recipe: save chat history in your own database",
  description:
    "A chat app whose threads and messages live in a SQLite database it owns.",
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
