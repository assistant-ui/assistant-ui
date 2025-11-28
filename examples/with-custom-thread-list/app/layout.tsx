import type { Metadata } from "next";
import "./globals.css";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

export const metadata: Metadata = {
  title: "Custom Thread List Example",
  description:
    "Example using @assistant-ui/react with a custom thread list adapter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-dvh">
      <body className="h-dvh antialiased">
        <MyRuntimeProvider>{children}</MyRuntimeProvider>
      </body>
    </html>
  );
}
