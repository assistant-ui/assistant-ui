import { useMemo, useState } from "react";
import { resource } from "@assistant-ui/tap";
import {
  detectTrigger,
  type TriggerMatch,
  type TriggerMatcher,
} from "./detectTrigger";

/** Detected trigger position within the composer text. */
export type DetectedTrigger = TriggerMatch;

export type TriggerDetectionResourceOutput = {
  /** Detected trigger (or `null` when inactive). */
  readonly trigger: DetectedTrigger | null;
  /** Current query string (empty when no trigger active). */
  readonly query: string;
  /** Update the tracked cursor position (wired to composer input). */
  setCursorPosition(pos: number): void;
};

/** Tracks cursor position and derives the active trigger + query from composer text. */
const useTriggerDetectionResource = ({
  text,
  triggerChar,
  matcher,
}: {
  text: string;
  triggerChar: string;
  matcher?: TriggerMatcher | undefined;
}): TriggerDetectionResourceOutput => {
  const [cursorPosition, setCursorPosition] = useState(text.length);

  const trigger = useMemo(() => {
    const pos = Math.min(cursorPosition, text.length);
    return detectTrigger(text, triggerChar, pos, matcher);
  }, [cursorPosition, matcher, text, triggerChar]);

  const query = trigger?.query ?? "";

  return {
    trigger,
    query,
    setCursorPosition,
  };
};

export const TriggerDetectionResource = resource(useTriggerDetectionResource);
