"use client";

import { useSyncExternalStore } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LibraryCopyButton } from "./library-copy-button";
import {
  Menu,
  MenuContent,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "./menu";

const STORAGE_KEY = "aui-library-snippet-tab";
const listeners = new Set<() => void>();

const readStored = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

const remember = (label: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, label);
  } catch {}
  for (const listener of listeners) listener();
};

/** Which way to install a person last picked, as the label of that way; every snippet and stepping command shares it. */
export const useLibrarySnippetChoice = () =>
  [useSyncExternalStore(subscribe, readStored, () => null), remember] as const;

/** A `command` shows a shell prompt; a `prompt` reads as plain text. */
export type LibrarySnippetTab = {
  label: string;
  code: string;
  kind: "command" | "prompt";
};

/**
 * Ways to install one thing, such as a CLI command and an agent prompt, as one
 * input group: the text, a copy button, and a menu to pick the way. The pick
 * is remembered and shared by every snippet.
 */
export function LibraryCodeSnippet({
  tabs,
  label,
  className,
}: {
  tabs: readonly LibrarySnippetTab[];
  label: string;
  className?: string;
}) {
  const [stored] = useLibrarySnippetChoice();
  const current = tabs.find((tab) => tab.label === stored) ?? tabs[0];
  if (!current) return null;

  return (
    <div
      className={cn(
        "border-foreground/10 bg-background flex h-9 min-w-0 items-center rounded-(--library-control) border",
        className,
      )}
    >
      <div
        role="group"
        aria-label={current.label}
        tabIndex={0}
        className="focus-visible:ring-ring min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto rounded-s-(--library-control) [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] outline-none focus-visible:ring-2 [&::-webkit-scrollbar]:hidden"
      >
        <code className="block w-max ps-4 pe-6 font-mono text-[13px] whitespace-nowrap select-all">
          {current.kind === "command" ? (
            <span aria-hidden className="text-muted-foreground me-2">
              $
            </span>
          ) : null}
          {current.code}
        </code>
      </div>
      <LibraryCopyButton
        text={current.code}
        label={`Copy ${current.label}`}
        className="me-1 rounded-(--library-icon)"
      />
      <Menu>
        <MenuTrigger
          aria-label={`${label}: ${current.label}`}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground data-popup-open:text-foreground border-foreground/10 h-full w-10 shrink-0 justify-center rounded-s-none rounded-e-(--library-control) border-s px-0 pe-1 pointer-coarse:h-full"
        >
          <ChevronDownIcon aria-hidden />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuRadioGroup
            value={current.label}
            onValueChange={(value) => remember(String(value))}
          >
            {tabs.map((tab) => (
              <MenuRadioItem key={tab.label} value={tab.label} closeOnClick>
                {tab.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    </div>
  );
}
