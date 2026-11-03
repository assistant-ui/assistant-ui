import type { ComponentType } from "react";

export interface ElementState {
  /** URL value for `?state=`; kebab-case, unique per element. */
  key: string;
  /** Switcher label: one or two words, sentence case. */
  label: string;
  /** One plain sentence naming the edge case, shown in the figure caption. */
  note?: string;
  /** Static fixture for this state. Omit only on `default`, which shows the live demo. */
  Component?: ComponentType;
}

export type ElementStates = readonly [ElementState, ...ElementState[]];

export const DEFAULT_STATE_KEY = "default";

export function defineStates<const T extends ElementStates>(states: T): T {
  return states;
}
