import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import { atlasTokens } from "@/components/diagrammatic/atlas";
import { Masthead } from "@/components/diagrammatic/masthead";
import { Colophon } from "@/components/diagrammatic/colophon";

const atlasSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-atlas",
  display: "swap",
});

const atlasMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-atlas-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Diagrammatic",
    default: "Diagrammatic — a field atlas of chart forms",
  },
};

export default function DiagrammaticLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        atlasSerif.variable,
        atlasMono.variable,
        atlasTokens,
        "min-h-svh w-full antialiased",
      )}
    >
      <Masthead />
      {children}
      <Colophon />
    </div>
  );
}
