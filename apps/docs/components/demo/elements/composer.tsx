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
  ComposerActions,
  ComposerAttachButton,
  ComposerAttachmentChip,
  ComposerAttachments,
  ComposerBar,
  ComposerCommandItem,
  ComposerContext,
  ComposerInput,
  ComposerMenu,
  ComposerModelItem,
  ComposerModelTrigger,
  ComposerPersonItem,
  ComposerSend,
  ComposerToolbar,
  ComposerVoice,
  ComposerVoiceButton,
  applyMention,
  useMentionMatches,
  useSlashMatches,
  type ComposerAttachment,
  type ComposerCommand,
  type ComposerModel,
  type ComposerPerson,
} from "@/components/assistant-ui/elements/composer";
import { useElapsed } from "@/components/demo/hooks/use-demo";

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
  const [modelOpen, setModelOpen] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const [voice, setVoice] = useState<"idle" | "recording" | "transcribing">(
    "idle",
  );
  const elapsedTenths = useElapsed(voice === "recording");
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(settle.current), []);

  const slashMatches = useSlashMatches(value, COMMANDS);
  const mentionMatches = useMentionMatches(value, PEOPLE);
  const active = voice !== "idle";

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
      <Composer>
        <ComposerMenu open={slashMatches.length > 0}>
          {slashMatches.map((command, i) => (
            <ComposerCommandItem
              key={command.name}
              command={command}
              active={i === 0}
              onClick={() => setValue(`/${command.name} `)}
            />
          ))}
        </ComposerMenu>
        <ComposerMenu open={mentionMatches.length > 0}>
          {mentionMatches.map((person, i) => (
            <ComposerPersonItem
              key={person.name}
              person={person}
              active={i === 0}
              onClick={() => setValue(applyMention(value, person.name))}
            />
          ))}
        </ComposerMenu>
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
          {active ? (
            <ComposerVoice
              recording={voice === "recording"}
              seconds={Math.floor(elapsedTenths / 10)}
            />
          ) : (
            <ComposerInput
              value={value}
              placeholder="Ask anything"
              onChange={(event) => setValue(event.target.value)}
              onSubmit={() => {
                const command = slashMatches[0];
                if (command) {
                  setValue(`/${command.name} `);
                  return;
                }
                const person = mentionMatches[0];
                if (person) {
                  setValue(applyMention(value, person.name));
                  return;
                }
                setValue("");
              }}
            />
          )}
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton onClick={() => setRemoved([])} />
              <div className="relative">
                <ComposerMenu open={modelOpen}>
                  {MODELS.map((entry) => (
                    <ComposerModelItem
                      key={entry.name}
                      entry={entry}
                      selected={entry.name === model}
                      onClick={() => {
                        setModel(entry.name);
                        setModelOpen(false);
                      }}
                    />
                  ))}
                </ComposerMenu>
                <ComposerModelTrigger
                  model={model}
                  open={modelOpen}
                  onClick={() => setModelOpen((open) => !open)}
                />
              </div>
            </ComposerActions>
            <ComposerActions>
              <ComposerContext
                usage={{ system: 12, tools: 8, messages: 54, total: 200 }}
              />
              <ComposerVoiceButton
                active={active}
                onClick={() => {
                  if (voice === "idle") {
                    setVoice("recording");
                    return;
                  }
                  // already settling: a third click must not stack a second timer
                  if (voice === "transcribing") return;
                  setVoice("transcribing");
                  settle.current = setTimeout(() => {
                    setVoice("idle");
                    setValue((v) => (v ? `${v} ${TRANSCRIPT}` : TRANSCRIPT));
                  }, 1400);
                }}
              />
              <ComposerSend
                streaming={false}
                idle={value.length === 0}
                onClick={() => setValue("")}
              />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}
