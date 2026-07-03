"use client";

import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  type FormEvent,
  forwardRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from "react";
import { useComposerSend } from "./ComposerSend";

export namespace ComposerPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.form>;
  /**
   * Props for the ComposerPrimitive.Root component.
   * Accepts all standard form element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.form>;
}

/**
 * The root form container for message composition.
 *
 * This component provides a form wrapper that handles message submission when the form
 * is submitted (e.g., via Enter key or submit button). It automatically prevents the
 * default form submission and triggers the composer's send functionality.
 *
 * Clicking blank space inside the form focuses the composer input (the first
 * textarea or contenteditable element), so the whole composer surface acts as a
 * click target. Interactive children (buttons, links, inputs, menu items) keep
 * their own behavior, and calling `preventDefault()` in your own `onMouseDown`
 * handler opts out.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Root>
 *   <ComposerPrimitive.Input placeholder="Type your message..." />
 *   <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
 * </ComposerPrimitive.Root>
 * ```
 */
export const ComposerPrimitiveRoot = forwardRef<
  ComposerPrimitiveRoot.Element,
  ComposerPrimitiveRoot.Props
>(({ onSubmit, onMouseDown, ...rest }, forwardedRef) => {
  const send = useComposerSend();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!send) return;
    send();
  };

  const handleMouseDown = (e: MouseEvent<HTMLFormElement>) => {
    if (e.button !== 0) return;
    if (
      (e.target as HTMLElement).closest(
        "button, a, input, textarea, select, label, [contenteditable], [role='button'], [role='menuitem'], [role='combobox'], [role='option']",
      )
    )
      return;
    e.preventDefault();
    e.currentTarget
      .querySelector<HTMLElement>("textarea, [contenteditable='true']")
      ?.focus();
  };

  return (
    <Primitive.form
      {...rest}
      ref={forwardedRef}
      onSubmit={composeEventHandlers(onSubmit, handleSubmit)}
      onMouseDown={composeEventHandlers(onMouseDown, handleMouseDown)}
    />
  );
});

ComposerPrimitiveRoot.displayName = "ComposerPrimitive.Root";
