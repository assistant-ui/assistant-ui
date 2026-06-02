"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
} from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { composeEventHandlers } from "@radix-ui/primitive";

export namespace ComposerPrimitiveMode {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.button>,
    "value"
  > & {
    /** The mode id this control selects. */
    value: string;
  };
}

/**
 * An unstyled button that selects a composer mode. Render one per mode you
 * support; clicking it calls `setMode(value)`. The active control is marked
 * with `data-active="true"`.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Mode value="plan">Plan</ComposerPrimitive.Mode>
 * <ComposerPrimitive.Mode value="debug">Debug</ComposerPrimitive.Mode>
 * ```
 */
export const ComposerPrimitiveMode = forwardRef<
  ComposerPrimitiveMode.Element,
  ComposerPrimitiveMode.Props
>(({ value, onClick, ...props }, forwardedRef) => {
  const aui = useAui();
  const isActive = useAuiState((s) => s.composer.mode === value);

  const handleSetMode = useCallback(() => {
    aui.composer().setMode(value);
  }, [aui, value]);

  return (
    <Primitive.button
      type="button"
      {...(isActive ? { "data-active": "true" } : {})}
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleSetMode)}
    />
  );
});

ComposerPrimitiveMode.displayName = "ComposerPrimitive.Mode";
