"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  MessagePartStatus,
  ReasoningMessagePart,
  TextMessagePart,
  MessagePartState,
} from "@assistant-ui/core";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useSmoothStatusStore } from "./SmoothContext";
import { writableStore } from "../../context/ReadonlyStore";

/**
 * Tuning options for the smooth text streaming animation.
 */
export type SmoothOptions = {
  /**
   * Target time in milliseconds to drain the backlog of unrevealed
   * characters. Larger values reveal long backlogs more gradually.
   * @default 250
   */
  drainMs?: number | undefined;
  /**
   * Maximum time in milliseconds between revealed characters, i.e. the
   * slowest reveal rate when the backlog is short.
   * @default 5
   */
  maxCharIntervalMs?: number | undefined;
  /**
   * Maximum number of characters revealed per animation frame.
   * @default Infinity
   */
  maxCharsPerFrame?: number | undefined;
};

const DEFAULT_DRAIN_MS = 250;
const DEFAULT_MAX_CHAR_INTERVAL_MS = 5;

class TextStreamAnimator {
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = Date.now();

  public targetText: string = "";
  public drainMs: number = DEFAULT_DRAIN_MS;
  public maxCharIntervalMs: number = DEFAULT_MAX_CHAR_INTERVAL_MS;
  public maxCharsPerFrame: number = Infinity;

  constructor(
    public currentText: string,
    private setText: (newText: string) => void,
  ) {}

  start() {
    if (this.animationFrameId !== null) return;
    this.lastUpdateTime = Date.now();
    this.animate();
  }

  stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = () => {
    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    let timeToConsume = deltaTime;

    const remainingChars = this.targetText.length - this.currentText.length;
    const baseTimePerChar = Math.min(
      this.maxCharIntervalMs,
      this.drainMs / remainingChars,
    );

    const frameLimit = Math.min(remainingChars, this.maxCharsPerFrame);
    let charsToAdd = 0;
    while (timeToConsume >= baseTimePerChar && charsToAdd < frameLimit) {
      charsToAdd++;
      timeToConsume -= baseTimePerChar;
    }
    // A cap-limited frame must not bank its surplus time, or the next
    // frame would burst past the cap.
    if (charsToAdd === this.maxCharsPerFrame) {
      timeToConsume = 0;
    }

    if (charsToAdd !== remainingChars) {
      this.animationFrameId = requestAnimationFrame(this.animate);
    } else {
      this.animationFrameId = null;
    }
    if (charsToAdd === 0) return;

    this.currentText = this.targetText.slice(
      0,
      this.currentText.length + charsToAdd,
    );
    this.lastUpdateTime = currentTime - timeToConsume;
    this.setText(this.currentText);
  };
}

const SMOOTH_STATUS: MessagePartStatus = Object.freeze({
  type: "running",
});

export const useSmooth = (
  state: MessagePartState & (TextMessagePart | ReasoningMessagePart),
  smooth: boolean | SmoothOptions = false,
): MessagePartState & (TextMessagePart | ReasoningMessagePart) => {
  const { text } = state;
  const enabled = smooth !== false;
  const {
    drainMs = DEFAULT_DRAIN_MS,
    maxCharIntervalMs = DEFAULT_MAX_CHAR_INTERVAL_MS,
    maxCharsPerFrame = Infinity,
  } = typeof smooth === "object" ? smooth : {};

  const [displayedText, setDisplayedText] = useState(
    state.status.type === "running" ? "" : text,
  );

  // Render-phase resync on part flip or text discontinuity, so the
  // first paint after a thread switch never shows the previous
  // part's text (#4051). `displayedText` is already a prefix of
  // `text` during normal streaming, so use it as the previous-text
  // reference instead of carrying separate state — avoids the
  // double render per streaming token. Read part identity through
  // `useAuiState` so we actually subscribe to its changes instead
  // of relying on a render-time proxy reference that may be stable
  // across thread swaps.
  const aui = useAui();
  const part = useAuiState(() => aui.part());
  const [prevPart, setPrevPart] = useState(part);
  if (part !== prevPart || !text.startsWith(displayedText)) {
    setPrevPart(part);
    setDisplayedText(state.status.type === "running" ? "" : text);
  }

  const smoothStatusStore = useSmoothStatusStore({ optional: true });
  const setText = useCallbackRef((text: string) => {
    setDisplayedText(text);
    if (smoothStatusStore) {
      const target =
        displayedText !== text || state.status.type === "running"
          ? SMOOTH_STATUS
          : state.status;
      writableStore(smoothStatusStore).setState(target, true);
    }
  });

  // TODO this is hacky
  useEffect(() => {
    if (smoothStatusStore) {
      const target =
        enabled && (displayedText !== text || state.status.type === "running")
          ? SMOOTH_STATUS
          : state.status;
      writableStore(smoothStatusStore).setState(target, true);
    }
  }, [smoothStatusStore, enabled, text, displayedText, state.status]);

  const [animatorRef] = useState<TextStreamAnimator>(
    new TextStreamAnimator(displayedText, setText),
  );

  useEffect(() => {
    animatorRef.drainMs = drainMs;
    animatorRef.maxCharIntervalMs = maxCharIntervalMs;
    animatorRef.maxCharsPerFrame = maxCharsPerFrame;
  }, [animatorRef, drainMs, maxCharIntervalMs, maxCharsPerFrame]);

  const animatorPartRef = useRef(part);
  useEffect(() => {
    if (!enabled) {
      animatorRef.stop();
      return;
    }

    // Discontinuity: part flipped, or new text breaks continuation
    // of the animator's current target. Either case requires
    // resetting the cursor — without the part check, a new part
    // whose text happens to share a prefix with the previous target
    // would keep the stale cursor and flicker.
    const partChanged = animatorPartRef.current !== part;
    animatorPartRef.current = part;
    if (partChanged || !text.startsWith(animatorRef.targetText)) {
      if (state.status.type === "running") {
        animatorRef.currentText = "";
        animatorRef.targetText = text;
        animatorRef.start();
      } else {
        animatorRef.currentText = text;
        animatorRef.targetText = text;
        animatorRef.stop();
      }
      return;
    }

    animatorRef.targetText = text;
    animatorRef.start();
  }, [animatorRef, enabled, text, state.status.type, part]);

  useEffect(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);

  return useMemo(
    () =>
      enabled
        ? {
            ...state,
            text: displayedText,
            status: text === displayedText ? state.status : SMOOTH_STATUS,
          }
        : state,
    [enabled, displayedText, state, text],
  );
};
