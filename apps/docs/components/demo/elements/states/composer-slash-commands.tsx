"use client";

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
  ComposerBar,
  ComposerCommandItem,
  ComposerInput,
  ComposerMenu,
  ComposerSend,
  ComposerToolbar,
  useSlashMatches,
  type ComposerCommand,
} from "@/components/assistant-ui/elements/composer";
import { defineStates } from "./types";

const noop = () => {};

const COMMANDS: ComposerCommand[] = [
  { name: "review", description: "Review the current diff", icon: SearchIcon },
  { name: "explain", description: "Explain the selection", icon: BookOpenIcon },
  { name: "branch", description: "Start a new branch", icon: GitBranchIcon },
  { name: "improve", description: "Suggest improvements", icon: SparklesIcon },
];

const LONG_COMMANDS: ComposerCommand[] = [
  {
    name: "review",
    description:
      "Review the current diff against the repo conventions and flag anything that should not ship",
    icon: SearchIcon,
  },
  {
    name: "release-notes",
    description:
      "Draft release notes from every merged pull request since the last tag",
    icon: SparklesIcon,
  },
];

function Slash({
  value,
  commands = COMMANDS,
}: {
  value: string;
  commands?: ComposerCommand[];
}) {
  const matches = useSlashMatches(value, commands);
  return (
    <div className="flex w-full max-w-lg flex-col">
      <div aria-hidden className="h-44" />
      <Composer>
        <ComposerMenu open={matches.length > 0}>
          {matches.map((command, i) => (
            <ComposerCommandItem
              key={command.name}
              command={command}
              active={i === 0}
              onClick={noop}
            />
          ))}
        </ComposerMenu>
        <ComposerBar>
          <ComposerInput
            value={value}
            placeholder="Ask anything"
            onChange={noop}
            onSubmit={noop}
          />
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton onClick={noop} />
            </ComposerActions>
            <ComposerActions>
              <ComposerSend
                streaming={false}
                idle={value.length === 0}
                onClick={noop}
              />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "filtered",
    label: "Filtered",
    note: "Typing after the slash narrows the menu to one command.",
    Component: () => <Slash value="/re" />,
  },
  {
    key: "no-matches",
    label: "No matches",
    note: "No command starts with the query, so the menu hides.",
    Component: () => <Slash value="/deploy" />,
  },
  {
    key: "long-content",
    label: "Long text",
    note: "Long descriptions truncate inside the menu width.",
    Component: () => <Slash value="/" commands={LONG_COMMANDS} />,
  },
]);
