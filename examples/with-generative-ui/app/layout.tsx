import type { Metadata } from "next";
import { GenerativeUIStyle } from "@/components/generative-ui-style";
import "./globals.css";

export const metadata: Metadata = {
  title: "assistant-ui Generative UI Example",
  description:
    "A chat that answers in Markdown, with the kit's generative UI components, or with a sandboxed widget",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <GenerativeUIStyle />
      </head>
      <body className="h-dvh">{children}</body>
    </html>
  );
}
