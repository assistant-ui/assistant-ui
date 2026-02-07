import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Dashboard",
  description: "CodeLayer-style agent supervision dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
