"use client";

import { useAui } from "@assistant-ui/store";
import type { AppendMessage } from "@assistant-ui/core";
import { agUiExtras } from "./agUiExtras";
import type { AgUiInterrupt, AgUiResumeEntry } from "./runtime/types";

const EMPTY_INTERRUPTS: readonly AgUiInterrupt[] = [];

/**
 * Read the pending AG-UI interrupts on the current thread. Returns an empty
 * array when no interrupts are pending, so consumers can `.map` without a guard.
 */
export const useAgUiInterrupts = (): readonly AgUiInterrupt[] =>
  agUiExtras.use((e) => e.interrupts, EMPTY_INTERRUPTS);

/**
 * Returns a function that submits responses (each `resolved` or `cancelled`)
 * for the pending AG-UI interrupts and resumes the run.
 */
export const useAgUiSubmitInterruptResponses = () => {
  const aui = useAui();
  return (responses: readonly AgUiResumeEntry[]): Promise<void> =>
    agUiExtras.get(aui).submitInterruptResponses(responses);
};

/**
 * Returns a function that discards the pending AG-UI interrupts and appends the
 * given user message, starting a fresh run. Use this when the user sends a new
 * message instead of resolving the interrupt(s): every open interrupt is
 * reported to the agent as cancelled.
 */
export const useAgUiSteerAway = () => {
  const aui = useAui();
  return (message: AppendMessage): Promise<void> =>
    agUiExtras.get(aui).steerAway(message);
};
