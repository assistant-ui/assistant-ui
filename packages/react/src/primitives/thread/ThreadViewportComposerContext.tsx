"use client";

import { createContext, useContext, type RefCallback } from "react";

type ThreadViewportComposerContextValue = {
  registerComposer: RefCallback<HTMLElement>;
};

const ThreadViewportComposerContext =
  createContext<ThreadViewportComposerContextValue | null>(null);

export const ThreadViewportComposerProvider =
  ThreadViewportComposerContext.Provider;

const noop: RefCallback<HTMLElement> = () => {};

export const useRegisterComposerElement = (): RefCallback<HTMLElement> => {
  const context = useContext(ThreadViewportComposerContext);
  return context?.registerComposer ?? noop;
};

/**
 * Registers an element as the "thread footer" (typically the composer wrapper).
 *
 * The viewport will measure this element's height and expose it via `useThreadLayout()`.
 * This is useful when you have a custom composer layout with additional UI elements
 * (like scroll buttons, padding, etc.) that should be included in the height measurement.
 *
 * @example
 * ```tsx
 * const Composer = () => {
 *   const registerComposerElement = useThreadViewportComposerElement();
 *
 *   return (
 *     <div ref={registerComposerElement} className="sticky bottom-0">
 *       <ScrollToBottomButton />
 *       <ComposerPrimitive.Root>
 *         <ComposerPrimitive.Input />
 *       </ComposerPrimitive.Root>
 *     </div>
 *   );
 * };
 * ```
 */
export const useThreadViewportComposerElement = useRegisterComposerElement;
