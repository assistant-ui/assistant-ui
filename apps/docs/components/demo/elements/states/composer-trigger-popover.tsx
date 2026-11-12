"use client";

import { useState, type FC, type ReactNode } from "react";
import {
  AtSignIcon,
  FileTextIcon,
  GlobeIcon,
  LanguagesIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type TriggerAdapter,
  type TriggerItem,
} from "@assistant-ui/react";
import { ComposerTriggerPopover } from "@/components/assistant-ui/elements/composer-trigger-popover.aui";
import { SampleScope } from "@/components/pages/docs/samples/sample-scope";
import { defineStates } from "./types";

const noop = () => {};

type IconComponent = FC<{ className?: string }>;

const MENTION_ITEMS: Record<string, readonly TriggerItem[]> = {
  tools: [
    {
      id: "get_weather",
      type: "tool",
      label: "Get weather",
      description: "Current conditions for a city",
      metadata: { icon: "tools" },
    },
    {
      id: "web_search",
      type: "tool",
      label: "Web search",
      description: "Search the public web",
      metadata: { icon: "tools" },
    },
  ],
  files: [
    {
      id: "docs/pricing.md",
      type: "file",
      label: "pricing.md",
      description: "docs/pricing.md",
      metadata: { icon: "files" },
    },
  ],
  people: [
    {
      id: "priya",
      type: "user",
      label: "Priya Shah",
      description: "Design",
      metadata: { icon: "people" },
    },
    {
      id: "marco",
      type: "user",
      label: "Marco Rossi",
      description: "Engineering",
      metadata: { icon: "people" },
    },
  ],
};

const mentionAdapter: TriggerAdapter = {
  categories: () => [
    { id: "tools", label: "Tools" },
    { id: "files", label: "Files" },
    { id: "people", label: "People" },
  ],
  categoryItems: (categoryId) => MENTION_ITEMS[categoryId] ?? [],
  search: (query) => {
    const lower = query.toLowerCase();
    return Object.values(MENTION_ITEMS)
      .flat()
      .filter((item) => item.label.toLowerCase().includes(lower));
  },
};

const mentionIcons: Record<string, IconComponent> = {
  tools: WrenchIcon,
  files: FileTextIcon,
  people: UserIcon,
};

const COMMANDS: readonly TriggerItem[] = [
  {
    id: "summarize",
    type: "command",
    label: "/summarize",
    description: "Summarize the conversation",
    metadata: { icon: "summarize" },
  },
  {
    id: "translate",
    type: "command",
    label: "/translate",
    description: "Translate to another language",
    metadata: { icon: "translate" },
  },
  {
    id: "search",
    type: "command",
    label: "/search",
    description: "Search the web",
    metadata: { icon: "search" },
  },
];

const slashAdapter: TriggerAdapter = {
  categories: () => [],
  categoryItems: () => [],
  search: (query) =>
    COMMANDS.filter((command) => command.id.startsWith(query.toLowerCase())),
};

const pendingAdapter: TriggerAdapter = {
  categories: () => [],
  categoryItems: () => [],
  search: () => [],
};

const slashIcons: Record<string, IconComponent> = {
  summarize: FileTextIcon,
  translate: LanguagesIcon,
  search: GlobeIcon,
};

const NO_MESSAGES: readonly ThreadMessageLike[] = [];

/**
 * A store-backed runtime whose composer already holds the trigger text, as if the
 * user had just typed it. Seeding before the first render keeps the server
 * HTML and the first paint on the documented state.
 */
function SeededRuntime({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const runtime = useExternalStoreRuntime<ThreadMessageLike>({
    messages: NO_MESSAGES,
    convertMessage: (message) => message,
    onNew: async () => {},
  });
  useState(() => runtime.thread.composer.setText(text));
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function Stage({ text, children }: { text: string; children: ReactNode }) {
  return (
    <SampleScope>
      <SeededRuntime text={text}>
        <div className="flex h-80 w-full max-w-md flex-col justify-end">
          <ComposerPrimitive.TriggerPopoverRoot>
            <ComposerPrimitive.Root className="relative w-full">
              <div className="bg-background rounded-2xl border px-4 py-3">
                <ComposerPrimitive.Input
                  rows={1}
                  placeholder="Type @ to mention or / for commands"
                  className="w-full resize-none bg-transparent text-sm outline-none"
                />
              </div>
              {children}
            </ComposerPrimitive.Root>
          </ComposerPrimitive.TriggerPopoverRoot>
        </div>
      </SeededRuntime>
    </SampleScope>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "categories",
    label: "Categories",
    note: "Typing @ opens the category list before any query.",
    Component: () => (
      <Stage text="Ask @">
        <ComposerTriggerPopover
          char="@"
          adapter={mentionAdapter}
          iconMap={mentionIcons}
          fallbackIcon={AtSignIcon}
          directive={{}}
        />
      </Stage>
    ),
  },
  {
    key: "search",
    label: "Search",
    note: "A query after @ skips the categories and lists matches from all of them.",
    Component: () => (
      <Stage text="Ask @pri">
        <ComposerTriggerPopover
          char="@"
          adapter={mentionAdapter}
          iconMap={mentionIcons}
          fallbackIcon={AtSignIcon}
          directive={{}}
        />
      </Stage>
    ),
  },
  {
    key: "commands",
    label: "Commands",
    note: "A slash trigger with no categories lists its commands directly.",
    Component: () => (
      <Stage text="/">
        <ComposerTriggerPopover
          char="/"
          adapter={slashAdapter}
          iconMap={slashIcons}
          action={{ onExecute: noop, removeOnExecute: true }}
        />
      </Stage>
    ),
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "A query that matches nothing shows the empty label.",
    Component: () => (
      <Stage text="/deploy">
        <ComposerTriggerPopover
          char="/"
          adapter={slashAdapter}
          iconMap={slashIcons}
          emptyItemsLabel="No matching commands"
          action={{ onExecute: noop, removeOnExecute: true }}
        />
      </Stage>
    ),
  },
  {
    key: "loading",
    label: "Loading",
    note: "An async source that has not returned yet shows the loading label.",
    Component: () => (
      <Stage text="Ask @mar">
        <ComposerTriggerPopover
          char="@"
          adapter={pendingAdapter}
          isLoading
          directive={{}}
        />
      </Stage>
    ),
  },
]);
