import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eve Example",
  description: "Example using @assistant-ui/eve with the eve/next plugin",
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
