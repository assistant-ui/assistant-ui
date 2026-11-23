import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./document-editor.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const pageFonts = `:root:has(.document-editor), body:has(.document-editor) {
  --font-sans: ${geist.style.fontFamily}, ui-sans-serif, system-ui, sans-serif;
  --font-mono: ${geistMono.style.fontFamily}, ui-monospace, SFMono-Regular, Menlo, monospace;
}`;

export const metadata: Metadata = { title: "Document editor" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "document-editor font-sans antialiased",
        geist.variable,
        geistMono.variable,
      )}
    >
      <style>{pageFonts}</style>
      {children}
    </div>
  );
}
