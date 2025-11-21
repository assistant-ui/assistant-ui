"use client";

import { createContext, useContext, type RefCallback } from "react";

type ThreadViewportSpacerContextValue = {
  registerSpacer: RefCallback<HTMLElement>;
};

const ThreadViewportSpacerContext =
  createContext<ThreadViewportSpacerContextValue | null>(null);

export const ThreadViewportSpacerProvider =
  ThreadViewportSpacerContext.Provider;

const noop: RefCallback<HTMLElement> = () => {};

export const useRegisterSpacerElement = (): RefCallback<HTMLElement> => {
  const context = useContext(ThreadViewportSpacerContext);
  return context?.registerSpacer ?? noop;
};

export const useThreadViewportSpacerElement = useRegisterSpacerElement;
