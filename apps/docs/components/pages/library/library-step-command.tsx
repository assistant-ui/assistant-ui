"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LibraryCommandStep } from "@/lib/library/library-data";
import { cn } from "@/lib/utils";
import { useLibrarySnippetChoice } from "./library-code-snippet";
import { LibraryCopyButton } from "./library-copy-button";
import { LibraryMenuIconButton } from "./library-icon-button";
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem } from "./menu";

const WAYS = ["CLI", "Agent prompt"] as const;

/**
 * An install command that steps: `base` stays put and a click swaps what
 * follows it for the next step. The menu at its end switches between the
 * command and what to tell a coding agent; the copy button copies whichever
 * is shown.
 */
export function LibraryStepCommand({
  base,
  steps,
  className,
}: {
  base: string;
  steps: readonly LibraryCommandStep[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useLibrarySnippetChoice();
  const step = steps[index % steps.length];
  if (!step) return null;
  const way = WAYS.find((entry) => entry === choice) ?? "CLI";
  const command = step.rest ? `${base} ${step.rest}` : base;
  const prompt = step.prompt ?? `${step.does} with \`${command}\``;
  const asPrompt = way === "Agent prompt";
  const text = asPrompt ? prompt : command;
  const more = steps.length > 1;

  return (
    <div
      className={cn(
        "border-foreground/10 bg-background relative flex h-8 w-full max-w-md min-w-0 items-center rounded-(--library-control) border ps-3",
        className,
      )}
    >
      <code className="flex min-w-0 flex-1 items-center overflow-hidden font-mono text-sm whitespace-nowrap [font-variant-ligatures:none]">
        {asPrompt ? (
          <span
            key={prompt}
            className="animate-in fade-in-0 slide-in-from-bottom-1 truncate duration-200 motion-reduce:animate-none"
          >
            {prompt}
          </span>
        ) : (
          <>
            <span aria-hidden className="text-muted-foreground me-2">
              $
            </span>
            <span className="shrink-0">{base}</span>
            <span
              key={step.rest}
              className="animate-in fade-in-0 slide-in-from-bottom-1 ms-[1ch] truncate duration-200 motion-reduce:animate-none"
            >
              {step.rest}
            </span>
          </>
        )}
      </code>
      {more ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={`${text}: ${step.does}. Show the next one.`}
                onClick={() =>
                  setIndex((current) => (current + 1) % steps.length)
                }
                className="focus-visible:ring-ring absolute inset-0 cursor-pointer rounded-(--library-control) outline-none focus-visible:ring-2"
              />
            }
          />
          <TooltipContent>
            {`${step.does}. Click for the next ${asPrompt ? "prompt" : "command"}.`}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <LibraryCopyButton
        text={text}
        label={asPrompt ? "Copy this prompt" : "Copy this command"}
        className="relative size-6"
      />
      <Menu>
        <LibraryMenuIconButton
          tooltip={`Install with: ${way}`}
          className="relative me-1 size-6 pointer-coarse:size-6"
        >
          <ChevronDownIcon aria-hidden />
        </LibraryMenuIconButton>
        <MenuContent align="end">
          <MenuRadioGroup
            value={way}
            onValueChange={(value) => setChoice(String(value))}
          >
            {WAYS.map((entry) => (
              <MenuRadioItem key={entry} value={entry} closeOnClick>
                {entry}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    </div>
  );
}
