"use client";

import { FileTextIcon, SlashIcon, UserIcon, WrenchIcon } from "lucide-react";
import { defaultDirectiveFormatter } from "@assistant-ui/react";
import {
  DirectiveText,
  createDirectiveText,
} from "@/components/assistant-ui/elements/directive-text.aui";
import { defineStates } from "./types";

const COMPLETE = { type: "complete" } as const;
const RUNNING = { type: "running" } as const;

const IconDirectiveText = createDirectiveText(defaultDirectiveFormatter, {
  iconMap: {
    tool: WrenchIcon,
    user: UserIcon,
    file: FileTextIcon,
    command: SlashIcon,
  },
});

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-md justify-end">
      <div className="bg-muted text-foreground max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "plain-text",
    label: "Plain text",
    note: "Text without directives renders unchanged.",
    Component: () => (
      <Bubble>
        <IconDirectiveText
          type="text"
          text="What's the weather in Tokyo this weekend?"
          status={COMPLETE}
        />
      </Bubble>
    ),
  },
  {
    key: "mixed-types",
    label: "Mixed types",
    note: "Users, files, and commands each get their own icon.",
    Component: () => (
      <Bubble>
        <IconDirectiveText
          type="text"
          text="Ask :user[Priya Shah]{name=priya} to review :file[pricing.md]{name=docs/pricing.md} and then run :command[summarize]{name=summarize}."
          status={COMPLETE}
        />
      </Bubble>
    ),
  },
  {
    key: "no-icons",
    label: "No icons",
    note: "The default export has no icon map, so chips show the label only.",
    Component: () => (
      <Bubble>
        <DirectiveText
          type="text"
          text="Use :tool[Get Weather]{name=get_weather} and :tool[Search]{name=web_search} for this."
          status={COMPLETE}
        />
      </Bubble>
    ),
  },
  {
    key: "partial",
    label: "Streaming",
    note: "A directive cut off mid-stream stays as raw text until it closes.",
    Component: () => (
      <Bubble>
        <IconDirectiveText
          type="text"
          text="Use :tool[Get Weather]{name=get_weather} and then :tool[Sea"
          status={RUNNING}
        />
      </Bubble>
    ),
  },
  {
    key: "long-content",
    label: "Long labels",
    note: "Long chip labels wrap with the surrounding sentence.",
    Component: () => (
      <Bubble>
        <IconDirectiveText
          type="text"
          text="Compare :file[2026 enterprise pricing and packaging proposal.md]{name=docs/pricing-proposal.md} with :file[competitor teardown, October.pdf]{name=research/teardown.pdf} and flag gaps for :user[Alexandra Montgomery-Whitfield]{name=alexandra}."
          status={COMPLETE}
        />
      </Bubble>
    ),
  },
]);
