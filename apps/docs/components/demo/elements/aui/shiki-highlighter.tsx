"use client";

import { SyntaxHighlightingSample } from "@/components/pages/docs/samples/syntax-highlighting";
import { RuntimeDemo } from "./surface";

export function AuiShikiHighlighterDemo() {
  return (
    <RuntimeDemo>
      <SyntaxHighlightingSample />
    </RuntimeDemo>
  );
}
