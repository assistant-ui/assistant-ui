"use client";

import { useEffect, useState } from "react";

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

export const useSmooth = (text: string, smooth: boolean = false) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [animatorRef] = useState<TextStreamAnimator>(
    new TextStreamAnimator(text, setDisplayedText),
  );

  useEffect(() => {
    if (!smooth) {
      animatorRef.stop();
      return;
    }

    if (!text.startsWith(animatorRef.targetText)) {
      setDisplayedText(text);
      animatorRef.currentText = text;
      animatorRef.targetText = text;
      animatorRef.stop();

      return;
    }

    animatorRef.targetText = text;
    animatorRef.start();
  }, [animatorRef, smooth, text]);

  useEffect(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);

  return smooth ? displayedText : text;
};
