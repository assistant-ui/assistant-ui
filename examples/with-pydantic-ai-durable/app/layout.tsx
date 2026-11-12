import type { Metadata } from "next";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Durable Pydantic AI threads",
  description: "Threads that keep running when the browser closes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-dvh">
      <body className="h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
