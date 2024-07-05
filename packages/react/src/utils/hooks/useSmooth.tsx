import { useEffect, useState } from "react";

class TextStreamAnimator {
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = Date.now();

  public targetText: string = "";

  constructor(
    private setText: (callback: (prevText: string) => string) => void,
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

    this.setText((currentText) => {
      const targetText = this.targetText;

      if (currentText === targetText) {
        this.animationFrameId = null;
        return currentText;
      }

      const remainingChars = targetText.length - currentText.length;
      const baseTimePerChar = Math.min(5, 250 / remainingChars);

      let charsToAdd = 0;
      while (timeToConsume >= baseTimePerChar && charsToAdd < remainingChars) {
        charsToAdd++;
        timeToConsume -= baseTimePerChar;
      }

      this.animationFrameId = requestAnimationFrame(this.animate);

      if (charsToAdd === 0) {
        return currentText;
      }

      const newText = targetText.slice(0, currentText.length + charsToAdd);
      this.lastUpdateTime = currentTime - timeToConsume;
      return newText;
    });
  };
}

export const useSmooth = (text: string, smooth: boolean = false) => {
  const [displayedText, setDisplayedText] = useState(text);
  const [animatorRef] = useState<TextStreamAnimator>(
    new TextStreamAnimator(setDisplayedText),
  );

  useEffect(() => {
    console.log("smooth", smooth);
    if (!smooth) {
      animatorRef.stop();
      return;
    }

    if (!text.startsWith(animatorRef.targetText)) {
      setDisplayedText(text);
      animatorRef.targetText = text;
      animatorRef.stop();
      return;
    }

    animatorRef.targetText = text;
    animatorRef.start();
    console.log("animating");
  }, [animatorRef, smooth, text]);

  useEffect(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);

  return smooth ? displayedText : text;
};
