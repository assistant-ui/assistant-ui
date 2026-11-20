import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./generative-frame-chat.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = { title: "Generative frame chat" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "generative-frame-chat font-sans antialiased",
        geist.variable,
        geistMono.variable,
      )}
    >
      {children}
    </div>
  );
}
