"use client";

import { useAui } from "@assistant-ui/store";
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
