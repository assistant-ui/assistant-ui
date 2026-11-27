"use client";

import {
  starterCommand,
  starterId,
  starterPrompt,
  type Starter,
} from "@/lib/library/starters-data";
import { LibraryItemMenu } from "./library-item-menu";

export function StarterMenu({
  starter,
  tooltipSide,
  className,
}: {
  starter: Starter;
  tooltipSide?: "left" | "top";
  className?: string;
}) {
  return (
    <LibraryItemMenu
      id={starterId(starter)}
      label={starter.label}
      command={starterCommand(starter)}
      prompt={starterPrompt(starter)}
      {...(tooltipSide && { tooltipSide })}
      {...(className && { className })}
    />
  );
}
