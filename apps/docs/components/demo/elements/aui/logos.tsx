"use client";

import {
  OpenAILogo,
  ClaudeLogo,
  GeminiLogo,
} from "@/components/assistant-ui/elements/logos";
import { DemoSurface } from "./surface";

export function AuiLogosDemo() {
  return (
    <DemoSurface>
      <div className="flex items-center gap-10">
        <OpenAILogo className="size-9" />
        <ClaudeLogo className="size-9" />
        <GeminiLogo className="size-9" />
      </div>
    </DemoSurface>
  );
}
