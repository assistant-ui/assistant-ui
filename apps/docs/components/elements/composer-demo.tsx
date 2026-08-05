"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpenIcon,
  GitBranchIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Composer,
  type ComposerAttachment,
  type ComposerCommand,
  type ComposerModel,
  type ComposerPerson,
} from "@/components/elements/composer";
import { useElapsed } from "./use-demo";

const COMMANDS: ComposerCommand[] = [
  { name: "review", description: "Review the current diff", icon: SearchIcon },
  { name: "explain", description: "Explain the selection", icon: BookOpenIcon },
  { name: "branch", description: "Start a new branch", icon: GitBranchIcon },
  { name: "improve", description: "Suggest improvements", icon: SparklesIcon },
];

const PEOPLE: ComposerPerson[] = [
  { name: "Mara", role: "human" },
  { name: "Max", role: "agent" },
  { name: "Aiden", role: "agent" },
  { name: "Ana", role: "human" },
];

const MODELS: ComposerModel[] = [
  { name: "Fable 5", meta: "1M ctx" },
  { name: "Opus 5", meta: "400k ctx" },
  { name: "Haiku 4.5", meta: "200k ctx" },
];

const TRANSCRIPT = "Summarize the review threads from this week";

export function ComposerDemo() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("Fable 5");
  const [removed, setRemoved] = useState<string[]>([]);
  const [voice, setVoice] = useState<"idle" | "recording" | "transcribing">(
    "idle",
  );
  const elapsedTenths = useElapsed(voice === "recording");
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(settle.current), []);

  const attachments: ComposerAttachment[] = [
    {
      name: "screenshot.png",
      meta: "128 KB",
      state: "done" as const,
      kind: "image" as const,
    },
  ].filter((a) => !removed.includes(a.name));

  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-40" />
      <Composer
        value={value}
        onValueChange={setValue}
        onSend={() => setValue("")}
        attachments={attachments}
        onRemoveAttachment={(name) => setRemoved((r) => [...r, name])}
        commands={COMMANDS}
        people={PEOPLE}
        models={MODELS}
        model={model}
        onModelChange={setModel}
        usage={{ system: 12, tools: 8, messages: 54, total: 200 }}
        recording={voice === "recording"}
        transcribing={voice === "transcribing"}
        recordingSeconds={Math.floor(elapsedTenths / 10)}
        onVoiceStart={() => setVoice("recording")}
        onVoiceStop={() => {
          setVoice("transcribing");
          settle.current = setTimeout(() => {
            setVoice("idle");
            setValue((v) => (v ? `${v} ${TRANSCRIPT}` : TRANSCRIPT));
          }, 1400);
        }}
      />
    </div>
  );
}
