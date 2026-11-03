import type { ElementStates } from "./types";
import { GENERATIVE_STATES } from "./generative";
import { states as approvalCard } from "./approval-card";
import { states as toolCall } from "./tool-call";

/** Every catalog element's preview states, keyed by slug. `states.test.tsx` fails on a missing slug. */
export const ELEMENT_STATES: Record<string, ElementStates> = {
  "approval-card": approvalCard,
  "tool-call": toolCall,
  ...GENERATIVE_STATES,
};

export function getElementStates(slug: string): ElementStates | undefined {
  return ELEMENT_STATES[slug];
}
