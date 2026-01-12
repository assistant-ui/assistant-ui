import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumable Stream Example",
  description:
    "Example using @assistant-ui/react with AI SDK resumable streaming",
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
