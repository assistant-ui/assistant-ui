import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui Interactables Example",
  description:
    "Example using assistant-ui interactable components with a task board",
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
