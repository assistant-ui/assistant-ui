import type { Metadata } from "next";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Tap-Native Runtime Example",
  description:
    "Example of tap-native runtime with ExternalThread and InMemoryThreadList",
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
