"use client";

import { BotIcon, TerminalIcon } from "lucide-react";
import type { LibraryCommands } from "@/lib/library/library-data";
import { useLibrarySnippetChoice } from "./library-code-snippet";
import { copyWithLibraryToast } from "./library-toast";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "./menu";

const WAYS = ["CLI", "Agent prompt"] as const;

/**
 * The Install button: a menu of the open tab's install commands, where a click
 * on one copies it. The switch at the top says whether that copies the command
 * or what to tell a coding agent, and the pick is shared with every snippet.
 * On a tab where nothing installs by command the button stays, switched off,
 * so the row reads the same on every tab.
 */
export function LibraryInstallMenu({
  commands,
}: {
  commands: LibraryCommands | undefined;
}) {
  const base = commands?.base ?? "";
  const steps = commands?.steps ?? [];
  const [choice, setChoice] = useLibrarySnippetChoice();
  const way = WAYS.find((entry) => entry === choice) ?? "CLI";
  const asPrompt = way === "Agent prompt";

  return (
    <Menu>
      <MenuTrigger
        disabled={!commands}
        className="bg-foreground text-background hover:bg-foreground/90 focus-visible:bg-foreground/90 data-popup-open:bg-foreground/90 disabled:hover:bg-foreground h-9 shrink-0 gap-1.5 rounded-(--library-control) px-3.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 pointer-coarse:h-9 [&_svg]:text-current"
      >
        <TerminalIcon aria-hidden />
        Install
      </MenuTrigger>
      <MenuContent align="end" className="w-80">
        <MenuGroup>
          <MenuLabel>Copy as</MenuLabel>
          <MenuRadioGroup
            value={way}
            onValueChange={(value) => setChoice(String(value))}
          >
            {WAYS.map((entry) => (
              <MenuRadioItem key={entry} value={entry}>
                {entry}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuLabel>{asPrompt ? "Agent prompts" : "Commands"}</MenuLabel>
          {steps.map((step) => {
            const command = step.rest ? `${base} ${step.rest}` : base;
            const prompt = step.prompt ?? `${step.does} with \`${command}\``;
            return (
              <MenuItem
                key={step.rest}
                onClick={() =>
                  asPrompt
                    ? copyWithLibraryToast(prompt, "Agent prompt copied.")
                    : copyWithLibraryToast(command, "Install command copied.")
                }
              >
                {asPrompt ? (
                  <BotIcon aria-hidden />
                ) : (
                  <TerminalIcon aria-hidden />
                )}
                <span className="min-w-0 shrink-0 truncate">{step.does}</span>
                <MenuShortcut className="min-w-0 truncate font-mono text-xs [font-variant-ligatures:none]">
                  {step.rest || base}
                </MenuShortcut>
              </MenuItem>
            );
          })}
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}
