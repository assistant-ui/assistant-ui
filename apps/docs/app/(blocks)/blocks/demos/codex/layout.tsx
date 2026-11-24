import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./codex.css";

export const metadata: Metadata = { title: "Codex" };

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const pageFonts = `:root:has(.codex), body:has(.codex) {
  --font-sans: ${inter.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ${geistMono.style.fontFamily}, ui-monospace, SFMono-Regular, Menlo, monospace;
}`;

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "codex font-sans antialiased",
        inter.variable,
        geistMono.variable,
      )}
    >
      <style>{pageFonts}</style>
      {children}
    </div>
  );
}
