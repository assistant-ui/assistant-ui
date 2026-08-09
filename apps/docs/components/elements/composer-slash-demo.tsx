"use client";

import { useState } from "react";
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
} from "@/components/elements/composer";

const COMMANDS: ComposerCommand[] = [
  { name: "review", description: "Review the current diff", icon: SearchIcon },
  { name: "explain", description: "Explain the selection", icon: BookOpenIcon },
  { name: "branch", description: "Start a new branch", icon: GitBranchIcon },
  { name: "improve", description: "Suggest improvements", icon: SparklesIcon },
];

export function ComposerSlashDemo() {
  const [value, setValue] = useState("/");
  const matches = useSlashMatches(value, COMMANDS);

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
              onClick={() => setValue(`/${command.name} `)}
            />
          ))}
        </ComposerMenu>
        <ComposerBar>
          <ComposerInput
            value={value}
            placeholder="Ask anything"
            onChange={(event) => setValue(event.target.value)}
            onSubmit={() => {
              const command = matches[0];
              setValue(command ? `/${command.name} ` : "");
            }}
          />
          <ComposerToolbar>
            <ComposerActions>
              <ComposerAttachButton onClick={() => undefined} />
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
    </div>
  );
}
