"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAui } from "@assistant-ui/store";
import type {
  MessagePartStatus,
  ReasoningMessagePart,
  TextMessagePart,
  MessagePartState,
} from "@assistant-ui/core";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useSmoothStatusStore } from "./SmoothContext";
import { writableStore } from "../../context/ReadonlyStore";

class TextStreamAnimator {
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = Date.now();

  public targetText: string = "";

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
    const baseTimePerChar = Math.min(5, 250 / remainingChars);

    let charsToAdd = 0;
    while (timeToConsume >= baseTimePerChar && charsToAdd < remainingChars) {
      charsToAdd++;
      timeToConsume -= baseTimePerChar;
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
  smooth: boolean = false,
): MessagePartState & (TextMessagePart | ReasoningMessagePart) => {
  const { text } = state;

  const [displayedText, setDisplayedText] = useState(
    state.status.type === "running" ? "" : text,
  );

  // Render-phase resync on part flip or text discontinuity, so the
  // first paint after a thread switch never shows the previous
  // part's text (#4051). `displayedText` is already a prefix of
  // `text` during normal streaming, so use it as the previous-text
  // reference instead of carrying separate state — avoids the
  // double render per streaming token.
  const part = useAui().part();
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
        smooth && (displayedText !== text || state.status.type === "running")
          ? SMOOTH_STATUS
          : state.status;
      writableStore(smoothStatusStore).setState(target, true);
    }
  }, [smoothStatusStore, smooth, text, displayedText, state.status]);

  const [animatorRef] = useState<TextStreamAnimator>(
    new TextStreamAnimator(displayedText, setText),
  );

  const animatorPartRef = useRef(part);
  useEffect(() => {
    if (!smooth) {
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
  }, [animatorRef, smooth, text, state.status.type, part]);

  useEffect(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);

  return useMemo(
    () =>
      smooth
        ? {
            type: "text",
            text: displayedText,
            status: text === displayedText ? state.status : SMOOTH_STATUS,
          }
        : state,
    [smooth, displayedText, state, text],
  );
};
