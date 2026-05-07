import type { Metadata } from "next";
import "./globals.css";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export const metadata: Metadata = {
  title: "ConvertGPT with assistant-ui",
  description: "FFmpeg integration with assistant-ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MyRuntimeProvider>
      <html lang="en" className="h-dvh">
        <body className="h-dvh font-sans">{children}</body>
      </html>
    </MyRuntimeProvider>
  );
}
