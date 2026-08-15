import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Instrument_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import { atlasTokens } from "@/components/diagrammatic/atlas";
import { Masthead } from "@/components/diagrammatic/masthead";

const atlasSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-atlas",
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
        atlasTokens,
        "min-h-svh w-full antialiased",
      )}
    >
      <Masthead />
      {children}
    </div>
  );
}
