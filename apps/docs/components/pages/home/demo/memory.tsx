"use client";

import type { ReactNode } from "react";
import { clearMemories, forgetMemory, useMemories } from "@/lib/memory-store";

export function MemoryView({
  onForget = forgetMemory,
  onClear = clearMemories,
}: {
  onForget?: (id: string) => void;
  onClear?: () => void;
} = {}): ReactNode {
  const memories = useMemories();

  return (
    <div className="h-full overflow-y-auto px-4 pt-6 md:px-6">
      <div className="mx-auto w-full max-w-(--thread-max-width) pb-12">
        <div className="flex items-baseline justify-between gap-6 px-2">
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Kept in this browser.
          </p>
          {memories.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="decoration-foreground/20 hover:text-foreground hover:decoration-foreground/60 text-muted-foreground shrink-0 font-mono text-[12px] underline underline-offset-[3px] transition-colors"
            >
              forget all
            </button>
          ) : null}
        </div>
        {memories.length === 0 ? (
          <p className="text-muted-foreground/70 mt-6 px-2 text-[15px] leading-relaxed">
            Nothing remembered yet. Ask the assistant to remember something.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className="group hover:bg-foreground/[0.025] rounded-control flex items-baseline gap-3 px-2 py-2 transition-colors"
              >
                <span className="min-w-0 flex-1 text-[15px] leading-relaxed">
                  {memory.text}
                </span>
                <button
                  type="button"
                  aria-label={`Forget "${memory.text}"`}
                  onClick={() => onForget(memory.id)}
                  className="decoration-foreground/20 hover:text-foreground hover:decoration-foreground/60 text-muted-foreground shrink-0 font-mono text-[12px] underline underline-offset-[3px] opacity-0 transition-colors group-hover:opacity-100 focus-visible:opacity-100"
                >
                  forget
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
