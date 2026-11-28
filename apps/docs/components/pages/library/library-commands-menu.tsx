"use client";

import { CopyIcon } from "lucide-react";
import type { LibraryCommand } from "@/lib/library/commands";
import { copyWithLibraryToast } from "./library-toast";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "./menu";

const GROUPS = [
  { id: "install", label: "Install" },
  { id: "agent", label: "Coding agent" },
] as const;

/** A button that says how many ways there are to get an item, and a menu that copies any one of them. */
export function LibraryCommandsMenu({
  name,
  commands,
}: {
  name: string;
  commands: readonly LibraryCommand[];
}) {
  const groups = GROUPS.filter((group) =>
    commands.some((command) => command.group === group.id),
  );
  return (
    <Menu>
      <MenuTrigger
        aria-label={`${commands.length} commands for ${name}`}
        className="border-foreground/15 text-muted-foreground hover:text-foreground h-7 gap-1.5 rounded-(--library-control) border px-2 text-xs tabular-nums [&_svg]:size-3.5"
      >
        <CopyIcon aria-hidden />
        {commands.length}
      </MenuTrigger>
      <MenuContent
        align="end"
        className="max-h-[min(32rem,70svh)] w-[26rem] overflow-y-auto"
      >
        {groups.map((group, index) => (
          <MenuGroup key={group.id}>
            {index > 0 ? <MenuSeparator /> : null}
            <MenuLabel>{group.label}</MenuLabel>
            {commands
              .filter((command) => command.group === group.id)
              .map((command) => (
                <MenuItem
                  key={command.command}
                  onClick={() =>
                    copyWithLibraryToast(
                      command.command,
                      `Copied: ${command.label}.`,
                    )
                  }
                  className="h-auto flex-col items-start gap-0.5 py-1.5"
                >
                  <span className="text-[13px]">
                    {command.label}
                    {command.note ? (
                      <span className="text-muted-foreground">
                        {" · "}
                        {command.note}
                      </span>
                    ) : null}
                  </span>
                  <code className="text-muted-foreground font-mono text-[11.5px] leading-4 [overflow-wrap:anywhere] whitespace-normal [font-variant-ligatures:none]">
                    {command.command}
                  </code>
                </MenuItem>
              ))}
          </MenuGroup>
        ))}
      </MenuContent>
    </Menu>
  );
}
