import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";
import { MyRuntimeProvider } from "./MyRuntimeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MyRuntimeProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} h-dvh font-sans antialiased`}
        >
          {children}
        </body>
      </html>
    </MyRuntimeProvider>
  );
}
