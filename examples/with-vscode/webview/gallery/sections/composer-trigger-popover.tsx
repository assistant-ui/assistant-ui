import { useEffect, useRef } from "react";
import {
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  LanguagesIcon,
  SlashIcon,
  UserIcon,
  WrenchIcon,
} from "lucide-react";
import {
  ComposerPrimitive,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
  type Unstable_SlashCommand,
} from "@assistant-ui/react";
import { ComposerTriggerPopover } from "@assistant-ui/ui/components/assistant-ui/elements/composer-trigger-popover.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";

const noop = () => {};

const SLASH_COMMANDS: readonly Unstable_SlashCommand[] = [
  {
    id: "summarize",
    description: "Summarize the conversation",
    icon: "FileText",
    execute: noop,
  },
  {
    id: "translate",
    description: "Translate to another language",
    icon: "Languages",
    execute: noop,
  },
  { id: "search", description: "Search the web", icon: "Globe", execute: noop },
];

function Triggers() {
  const mention = unstable_useMentionAdapter({
    categories: [
      {
        id: "tools",
        label: "Tools",
        items: [
          {
            id: "get_weather",
            type: "tool",
            label: "Get weather",
            icon: "tool",
          },
          { id: "calendar", type: "tool", label: "Calendar", icon: "calendar" },
        ],
      },
      {
        id: "people",
        label: "People",
        items: [
          { id: "mara", type: "user", label: "Mara", icon: "user" },
          { id: "aiden", type: "user", label: "Aiden", icon: "user" },
        ],
      },
    ],
  });
  const slash = unstable_useSlashCommandAdapter({ commands: SLASH_COMMANDS });
  return (
    <>
      <ComposerTriggerPopover
        char="@"
        {...mention}
        iconMap={{
          tools: WrenchIcon,
          people: UserIcon,
          tool: WrenchIcon,
          calendar: CalendarIcon,
          user: UserIcon,
        }}
      />
      <ComposerTriggerPopover
        char="/"
        {...slash}
        iconMap={{
          FileText: FileTextIcon,
          Languages: LanguagesIcon,
          Globe: GlobeIcon,
        }}
        fallbackIcon={SlashIcon}
      />
    </>
  );
}

/** Types `text` into the composer on mount, which opens its trigger popover. */
function TriggerComposer({ text }: { text?: string }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.setSelectionRange(text.length, text.length);
      input.dispatchEvent(new Event("select", { bubbles: true }));
    }, 50);
    return () => clearTimeout(id);
  }, [text]);

  return (
    <div className="flex h-72 flex-col justify-end">
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <ComposerPrimitive.Root className="border-border bg-background relative flex w-full flex-col rounded-2xl border">
          <ComposerPrimitive.Input
            ref={inputRef}
            placeholder="Type @ to mention or / for a command"
            className="field-sizing-content min-h-10 w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm focus:outline-none"
            rows={1}
          />
          <div className="flex justify-end px-3 pb-3">
            <ComposerPrimitive.Send className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs disabled:opacity-40">
              Send
            </ComposerPrimitive.Send>
          </div>
          <Triggers />
        </ComposerPrimitive.Root>
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </div>
  );
}

export default defineSections([
  {
    id: "composer-trigger-popover-mention",
    title: "Composer trigger popover (@ mention)",
    category: "chat",
    notes:
      "composer-trigger-popover.aui.tsx with a categorized mention adapter; @ is typed on mount, so the category list is open.",
    render: () => (
      <SeededRuntime messages={[]}>
        <TriggerComposer text="@" />
      </SeededRuntime>
    ),
  },
  {
    id: "composer-trigger-popover-slash",
    title: "Composer trigger popover (/ command)",
    category: "chat",
    notes: "The slash-command adapter; / is typed on mount.",
    render: () => (
      <SeededRuntime messages={[]}>
        <TriggerComposer text="/" />
      </SeededRuntime>
    ),
  },
]);
