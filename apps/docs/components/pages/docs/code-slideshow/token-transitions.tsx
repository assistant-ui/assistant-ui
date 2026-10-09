"use client";

import React from "react";
import {
  InnerPre,
  InnerToken,
  getPreRef,
  type AnnotationHandler,
  type CustomPreProps,
} from "codehike/code";
import {
  calculateTransitions,
  getStartingSnapshot,
  type TokenTransitionsSnapshot,
} from "codehike/utils/token-transitions";

const MAX_TRANSITION_DURATION = 750;

class SmoothPre extends React.Component<CustomPreProps> {
  ref: React.RefObject<HTMLPreElement>;

  constructor(props: CustomPreProps) {
    super(props);
    this.ref = getPreRef(this.props);
  }

  override render() {
    return <InnerPre merge={this.props} style={{ position: "relative" }} />;
  }

  override getSnapshotBeforeUpdate() {
    return getStartingSnapshot(this.ref.current!);
  }

  override componentDidUpdate(
    _prevProps: unknown,
    _prevState: unknown,
    snapshot: TokenTransitionsSnapshot,
  ) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const transitions = calculateTransitions(this.ref.current!, snapshot);
    for (const { element, keyframes, options } of transitions) {
      const { translateX, translateY, ...rest } = keyframes;
      const frames: PropertyIndexedKeyframes = { ...rest };
      if (translateX && translateY) {
        frames.translate = [
          `${translateX[0]}px ${translateY[0]}px`,
          `${translateX[1]}px ${translateY[1]}px`,
        ];
      }
      element.animate(frames, {
        duration: options.duration * MAX_TRANSITION_DURATION,
        delay: options.delay * MAX_TRANSITION_DURATION,
        easing: options.easing,
        fill: options.fill,
      });
    }
  }
}

export const tokenTransitions: AnnotationHandler = {
  name: "token-transitions",
  PreWithRef: SmoothPre,
  Token: (props) => (
    <InnerToken merge={props} style={{ display: "inline-block" }} />
  ),
};
