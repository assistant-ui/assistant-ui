import type { Metadata } from "next";
import { MyRuntimeProvider } from "@/app/MyRuntimeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "A2UI Example",
  description: "A2UI declarative UI rendering with AI SDK",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-dvh">
      <body className="h-dvh font-sans">
        <MyRuntimeProvider>{children}</MyRuntimeProvider>
      </body>
    </html>
  );
}
