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
  onDetails,
  tooltipSide,
  className,
}: {
  starter: Starter;
  /** Opens the starter's details. */
  onDetails: () => void;
  tooltipSide?: "left" | "top";
  className?: string;
}) {
  return (
    <LibraryItemMenu
      id={starterId(starter)}
      label={starter.label}
      command={starterCommand(starter)}
      prompt={starterPrompt(starter)}
      onDetails={onDetails}
      docs="/docs/cli#create"
      {...(tooltipSide && { tooltipSide })}
      {...(className && { className })}
    />
  );
}
