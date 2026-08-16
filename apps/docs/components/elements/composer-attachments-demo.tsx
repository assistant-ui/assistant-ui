"use client";

import { useState } from "react";
import {
  Composer,
  ComposerActions,
  ComposerAttachButton,
  ComposerAttachmentChip,
  ComposerAttachments,
  ComposerBar,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
  type ComposerAttachment,
} from "@/components/elements/composer";
import { useStoryPhases } from "./use-demo";

const PHASES = [900, 900, 900, 0] as const;
const PROGRESS = [18, 62, 100, 100] as const;

export function ComposerAttachmentsDemo() {
  const { phase } = useStoryPhases(PHASES);
  const [value, setValue] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);
  const done = phase >= 3;

  const attachments: ComposerAttachment[] = [
    {
      name: "screenshot.png",
      meta: done ? "128 KB" : "uploading",
      state: done ? ("done" as const) : ("uploading" as const),
      progress: PROGRESS[Math.min(phase, 3)] ?? 100,
      kind: "image" as const,
    },
    {
      name: "trace.log",
      meta: "38 KB",
      state: "done" as const,
      kind: "text" as const,
    },
  ].filter((a) => !removed.includes(a.name));

  return (
    <Composer>
      <ComposerBar>
        {attachments.length > 0 && (
          <ComposerAttachments>
            {attachments.map((attachment) => (
              <ComposerAttachmentChip
                key={attachment.name}
                attachment={attachment}
                onRemove={(name) => setRemoved((r) => [...r, name])}
              />
            ))}
          </ComposerAttachments>
        )}
        <ComposerInput
          value={value}
          placeholder="Ask anything"
          onChange={(event) => setValue(event.target.value)}
          onSubmit={() => setValue("")}
        />
        <ComposerToolbar>
          <ComposerActions>
            <ComposerAttachButton onClick={() => setRemoved([])} />
          </ComposerActions>
          <ComposerActions>
            <ComposerSend
              streaming={false}
              idle={value.length === 0}
              onClick={() => setValue("")}
            />
          </ComposerActions>
        </ComposerToolbar>
      </ComposerBar>
    </Composer>
  );
}
