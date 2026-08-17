"use client";

import { WebPreview } from "@/components/elements/web-preview";
import { useStoryPhases } from "./use-demo";

const PHASES = [1500, 0] as const;

export function WebPreviewDemo() {
  const { phase } = useStoryPhases(PHASES);

  return (
    <WebPreview origin="scf.auiusercontent.com" loading={phase === 0}>
      <div className="flex flex-col gap-3 p-5">
        <span className="text-[15px] font-medium tracking-tight">
          Quarterly summary
        </span>
        <span className="text-foreground/55 text-xs leading-relaxed">
          Stand-in content. The element draws the chrome only; in a real app you
          pass a sandboxed frame as its child, and that frame is what isolates
          model-written markup from this page.
        </span>
        <div className="flex gap-1.5">
          {[62, 38, 84, 51].map((height, i) => (
            <span
              key={i}
              className="w-6 rounded-t bg-blue-500/70 dark:bg-blue-400/70"
              style={{ height: `${height * 0.4}px` }}
            />
          ))}
        </div>
      </div>
    </WebPreview>
  );
}
