import type { Metadata } from "next";
import "./globals.css";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export const metadata: Metadata = {
  title: "Mastra Example - assistant-ui",
  description: "AI chat application powered by Mastra and assistant-ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-dvh">
        <MyRuntimeProvider>{children}</MyRuntimeProvider>
      </body>
    </html>
  );
}