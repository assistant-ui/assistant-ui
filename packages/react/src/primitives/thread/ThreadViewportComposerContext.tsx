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
 * The viewport measures this element and writes CSS custom properties such as
 * `--aui-thread-composer-height`, allowing layouts to react without subscribing
 * to React context. This is useful when you have custom composer chrome (scroll
 * buttons, padding, etc.) that should count toward the measured height.
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
