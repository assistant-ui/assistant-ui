import { useEffect, useState } from "react";

class TextStreamAnimator {
  private animationFrameId: number | null = null;
  private lastUpdateTime: number = Date.now();
  private decayFactor: number = 0.99;

  public targetText: string = "";

  constructor(
    private setText: (callback: (prevText: string) => string) => void,
  ) {}

  start() {
    if (this.animationFrameId !== null) return;
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
    this.lastUpdateTime = currentTime;

    this.setText((currentText) => {
      const targetText = this.targetText;

      if (currentText === targetText) {
        this.animationFrameId = null;
        return currentText;
      }

      const remainingChars = targetText.length - currentText.length;
      const charsToAdd = Math.max(
        1,
        Math.floor(
          remainingChars * (1 - Math.pow(this.decayFactor, deltaTime)),
        ),
      );
      const newText = targetText.slice(0, currentText.length + charsToAdd);
      this.animationFrameId = requestAnimationFrame(this.animate);
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
  }, [animatorRef, smooth, text]);

  useEffect(() => {
    return () => {
      animatorRef.stop();
    };
  }, [animatorRef]);

  return smooth ? displayedText : text;
};
