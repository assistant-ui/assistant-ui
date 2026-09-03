"use client";

import {
  type AssistantToolProps,
  type ToolCallMessagePartProps,
  useAssistantInstructions,
  useAssistantTool,
} from "@assistant-ui/react";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import { TraceLine } from "@/components/shared/trace-line";
import { typeEyebrow } from "@/components/shared/type";
import {
  addMemory,
  clearMemories,
  forgetMemory,
  useMemories,
  type MemoryRecord,
} from "@/lib/memory-store";
import { cn } from "@/lib/utils";

type RememberArgs = {
  text: string;
};

type RememberResult = {
  id: string;
  text: string;
  change: "added" | "existing";
};

type RememberToolUIProps = Pick<
  ToolCallMessagePartProps<RememberArgs, RememberResult>,
  "result" | "status"
> & {
  onForget?: (id: string) => void;
};

const rememberTool = {
  toolName: "remember",
  type: "frontend",
  display: "standalone",
  description:
    "Save a short fact or preference the user explicitly asks you to remember for future conversations. Call it once per fact, rewritten in the third person.",
  parameters: z.object({
    text: z
      .string()
      .describe(
        "The short fact or preference to remember in the third person.",
      ),
  }),
  execute: ({ text }: RememberArgs) => {
    const { record, change } = addMemory(text);
    return { ...record, change };
  },
  render: RememberToolUI,
} satisfies AssistantToolProps<RememberArgs, RememberResult>;

export function HomeMemory(): null {
  const memories = useMemories();
  const instruction = useMemo(
    () =>
      [
        "Things the user asked you to remember (stored on this device, may be outdated):",
        ...memories.map((memory) => `- ${memory.text}`),
      ].join("\n"),
    [memories],
  );

  useAssistantInstructions({
    instruction,
    disabled: memories.length === 0,
  });
  useAssistantTool(rememberTool);

  return null;
}

export function RememberToolUI({
  result,
  status,
  onForget = forgetMemory,
}: RememberToolUIProps): ReactNode {
  if (status?.type === "running") {
    return <TraceLine live label="saving" detail="to memory" />;
  }

  if (!result) return null;

  return (
    <div className="flex items-baseline gap-3">
      <TraceLine live={false} label="remembered" detail={result.text} />
      <button
        type="button"
        aria-label={`Forget "${result.text}"`}
        onClick={() => onForget(result.id)}
        className="decoration-foreground/20 hover:text-foreground hover:decoration-foreground/60 text-muted-foreground shrink-0 font-mono text-[12px] underline underline-offset-[3px] transition-colors"
      >
        forget
      </button>
    </div>
  );
}

export function SidebarMemory({
  memories,
  onForget = forgetMemory,
  onClear = clearMemories,
}: {
  memories: readonly MemoryRecord[];
  onForget?: (id: string) => void;
  onClear?: () => void;
}): ReactNode {
  const [open, setOpen] = useState(false);

  if (memories.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-expanded={open}
          className={cn(
            typeEyebrow,
            "hover:text-foreground mt-0 mb-1 flex flex-1 items-center gap-1 px-2 transition-colors",
          )}
        >
          <ChevronDownIcon
            className={cn("size-3 transition-transform", !open && "-rotate-90")}
          />
          Memory ({memories.length})
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground hover:text-foreground mb-1 px-2 text-[11px] transition-colors"
        >
          Forget all
        </button>
      </div>
      {open ? (
        <ul className="flex flex-col gap-0.5">
          {memories.map((memory) => (
            <li key={memory.id} className="group flex items-start gap-1 px-2">
              <span className="text-muted-foreground flex-1 py-1 text-[13px] leading-snug">
                {memory.text}
              </span>
              <button
                type="button"
                aria-label={`Forget "${memory.text}"`}
                onClick={() => onForget(memory.id)}
                className="text-muted-foreground/50 hover:text-foreground rounded-control grid size-6 shrink-0 place-items-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <XIcon className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
