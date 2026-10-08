import { useState } from "react";
import {
  codeScroll,
  codeSurface,
  field,
  fieldInteractive,
  floating,
  ghostButton,
  inkButton,
  live,
  mono,
  paper,
  ShimmerLabel,
  SwapLabel,
} from "@assistant-ui/ui/components/assistant-ui/elements/surfaces.tsx";
import { cn } from "@/lib/utils";
import { defineSections } from "../types";

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <div className={cn(className, "rounded-xl px-3 py-2 text-xs")}>
      <span className={mono}>{label}</span>
    </div>
  );
}

function SwapDemo() {
  const [active, setActive] = useState<0 | 1>(0);
  return (
    <button
      type="button"
      onClick={() => setActive((current) => (current === 0 ? 1 : 0))}
      className={cn(ghostButton, "w-fit px-3 py-1.5 text-xs")}
    >
      <SwapLabel active={active}>
        <span>Copy</span>
        <span>Copied to the clipboard</span>
      </SwapLabel>
    </button>
  );
}

export default defineSections([
  {
    id: "surfaces",
    title: "Surfaces",
    category: "agents",
    notes:
      "The shared tokens every element builds on: paper, floating, field, interactive field, ink and ghost buttons, the live tint, mono, the shimmer and swap labels, and a code scroll row.",
    render: () => (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Swatch className={paper} label="paper" />
          <Swatch className={floating} label="floating" />
          <Swatch className={field} label="field" />
          <Swatch className={fieldInteractive} label="fieldInteractive" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(inkButton, "rounded-full px-3 py-1.5 text-xs")}
          >
            inkButton
          </button>
          <button
            type="button"
            className={cn(ghostButton, "px-3 py-1.5 text-xs")}
          >
            ghostButton
          </button>
          <SwapDemo />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          <span className={live}>live tint</span>
          <ShimmerLabel>Shimmering while active</ShimmerLabel>
          <ShimmerLabel active={false}>Settled label</ShimmerLabel>
        </div>
        <div className={cn(field, codeScroll, "rounded-lg")}>
          <div className={cn(codeSurface, mono, "px-3 py-2 whitespace-pre")}>
            {
              "$ pnpm --filter with-vscode probes --reporter=verbose --grep gallery-overflow"
            }
          </div>
        </div>
      </div>
    ),
  },
]);
