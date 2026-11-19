import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import "./block.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`primitives-chat ${geist.className} ${geist.variable}`}>
      {children}
    </div>
  );
}
