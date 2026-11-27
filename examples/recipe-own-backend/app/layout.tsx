import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recipe: connect the chat to your own backend",
  description:
    "A chat UI that streams replies from a backend endpoint with its own request format.",
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
