import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Dashboard MVP",
  description: "Agent supervision dashboard using @assistant-ui/react-agent",
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
