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
  const command = starterCommand(starter);
  return (
    <LibraryItemMenu
      id={starterId(starter)}
      label={starter.label}
      prompt={starterPrompt(starter)}
      onDetails={onDetails}
      docs={starter.hosted?.preview ?? "/docs/cli#create"}
      {...(command && { command })}
      {...(tooltipSide && { tooltipSide })}
      {...(className && { className })}
    />
  );
}
