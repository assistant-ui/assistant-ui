import type { Metadata } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import { MyRuntimeProvider } from "@/app/MyRuntimeProvider";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Light | assistant-ui example",
  description:
    "A calm, light-first assistant interface built with assistant-ui.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
        <MyRuntimeProvider>{children}</MyRuntimeProvider>
      </body>
    </html>
  );
}
