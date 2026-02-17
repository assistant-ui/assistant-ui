import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Univer Sheets Spike",
  description:
    "assistant-ui split-pane demo with chat on the left and a live Univer spreadsheet on the right",
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
