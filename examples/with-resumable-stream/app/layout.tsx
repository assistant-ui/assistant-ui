import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumable Stream Example",
  description:
    "Demonstrates assistant-stream/resumable: persist an in-flight LLM response so the client can reload mid-stream and pick up where it left off.",
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
