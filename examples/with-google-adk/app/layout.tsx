import type { Metadata } from "next";
import { MyRuntimeProvider } from "@/app/MyRuntimeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google ADK Example",
  description: "Example using @assistant-ui/react with Google ADK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MyRuntimeProvider>
      <html lang="en">
        <body className="h-dvh">{children}</body>
      </html>
    </MyRuntimeProvider>
  );
}
