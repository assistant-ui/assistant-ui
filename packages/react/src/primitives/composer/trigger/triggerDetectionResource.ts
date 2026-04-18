import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import { detectTrigger } from "./detectTrigger";

/** Detected trigger position within the composer text. */
export type DetectedTrigger = {
  readonly offset: number;
  readonly query: string;
};

export type TriggerDetectionResourceOutput = {
  /** Detected trigger (or `null` when inactive). */
  readonly trigger: DetectedTrigger | null;
  /** Current query string (empty when no trigger active). */
  readonly query: string;
  /** Update the tracked cursor position (wired to composer input). */
  setCursorPosition(pos: number): void;
};

/** Tracks cursor position and derives the active trigger + query from composer text. */
export const TriggerDetectionResource = resource(
  ({
    text,
    triggerChar,
  }: {
    text: string;
    triggerChar: string;
  }): TriggerDetectionResourceOutput => {
    const [cursorPosition, setCursorPosition] = tapState(text.length);

    const trigger = tapMemo(() => {
      const pos = Math.min(cursorPosition, text.length);
      return detectTrigger(text, triggerChar, pos);
    }, [cursorPosition, text, triggerChar]);

    const query = trigger?.query ?? "";

    return {
      trigger,
      query,
      setCursorPosition,
    };
  },
);
