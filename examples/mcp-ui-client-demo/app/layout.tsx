import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Tool UI Example",
  description: "Example of assistant-ui with MCP server and tool-ui components",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
