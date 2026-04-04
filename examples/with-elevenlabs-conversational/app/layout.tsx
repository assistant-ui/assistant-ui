import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElevenLabs Conversational AI Example",
  description:
    "Example using @assistant-ui/react with ElevenLabs Conversational AI for realtime voice",
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
