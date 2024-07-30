"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMessageContext } from "../../context";
import {
  ContentPartStatus,
  ToolCallContentPartStatus,
} from "../../types/AssistantTypes";
import { TextContentPartState } from "../../context/stores/ContentPart";
import { useSmoothContext } from "./SmoothContext";
import { StoreApi } from "zustand";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";

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

const SMOOTH_STATUS: ContentPartStatus = Object.freeze({
  type: "running",
});

export const useSmooth = (
  state: TextContentPartState,
  smooth: boolean = false,
): TextContentPartState => {
  const { useSmoothStatus } = useSmoothContext({ optional: true }) ?? {};

  const {
    part: { text },
  } = state;
  const { useMessage } = useMessageContext();
  const id = useMessage((m) => m.message.id);

  const idRef = useRef(id);
  const [displayedText, setDisplayedText] = useState(text);

  const setText = useCallbackRef((text: string) => {
    setDisplayedText(text);
    (
      useSmoothStatus as unknown as
        | StoreApi<ToolCallContentPartStatus>
        | undefined
    )?.setState(text !== state.part.text ? SMOOTH_STATUS : state.status);
  });

  const [animatorRef] = useState<TextStreamAnimator>(
    new TextStreamAnimator(text, setText),
  );

  useEffect(() => {
    if (!smooth) {
      animatorRef.stop();
      return;
    }

    if (idRef.current !== id || !text.startsWith(animatorRef.targetText)) {
      idRef.current = id;
      setText(text);

      animatorRef.currentText = text;
      animatorRef.targetText = text;
      animatorRef.stop();

      return;
    }

    animatorRef.targetText = text;
    animatorRef.start();
  }, [setText, animatorRef, id, smooth, text]);

  useEffect(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);

  return useMemo(
    () =>
      smooth
        ? {
            part: { type: "text", text: displayedText },
            status: text === displayedText ? state.status : SMOOTH_STATUS,
          }
        : state,
    [smooth, displayedText, state, text],
  );
};
