"use client";

import { useState } from "react";
import {
  Composer,
  type ComposerAttachment,
} from "@/components/elements/composer";
import { useElapsed, useStoryPhases } from "./use-demo";

const PHASES = [2400, 2400, 3000, 0] as const;

export function ComposerAttachmentsDemo() {
  const { phase, running } = useStoryPhases(PHASES);
  const [value, setValue] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const tenths = useElapsed(running && phase < 2);

  const progressA = Math.min(96, tenths * 4.5);
  const progressB = Math.min(96, Math.max(0, (tenths - 24) * 4.5));

  const attachments: ComposerAttachment[] = [
    {
      name: "design-review.pdf",
      meta: phase === 0 ? "Uploading" : "2.4 MB",
      state: phase === 0 ? ("uploading" as const) : ("done" as const),
      progress: progressA,
      kind: "text" as const,
    },
    ...(phase >= 1
      ? [
          {
            name: "screens.zip",
            meta: phase === 1 ? "Uploading" : "18 MB",
            state: phase === 1 ? ("uploading" as const) : ("done" as const),
            progress: progressB,
            kind: "archive" as const,
          },
        ]
      : []),
  ].filter((a) => !removed.includes(a.name));

  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSend={() => setValue("")}
      placeholder="Add a note for the review"
      attachments={attachments}
      {...(phase >= 2
        ? {
            onRemoveAttachment: (name: string) =>
              setRemoved((r) => [...r, name]),
          }
        : {})}
    />
  );
}
