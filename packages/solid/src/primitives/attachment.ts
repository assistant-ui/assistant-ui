import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/** A wrapper element scoped to the current attachment. */
export const AttachmentPrimitiveRoot = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [, rest] = splitProps(props, []);
  return createComponent(Dynamic, mergeProps(rest, { component: "div" }));
};

/** Renders the current attachment's file name as raw text. */
export const AttachmentPrimitiveName = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const name = useAuiState((s) => s.attachment.name);
  return (() => props.children ?? name()) as unknown as JSX.Element;
};

/**
 * Renders a short label for the current attachment: the file extension when
 * the name has one, otherwise the attachment type.
 */
export const AttachmentPrimitiveThumb = (
  props: JSX.HTMLAttributes<HTMLDivElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["children"]);
  const label = useAuiState((s) => {
    const name = s.attachment.name;
    const dot = name.lastIndexOf(".");
    return dot > 0 && dot < name.length - 1
      ? `.${name.slice(dot + 1)}`
      : s.attachment.type;
  });
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "div",
      get children() {
        return local.children ?? label();
      },
    }),
  );
};

/** A button that removes the current attachment. */
export const AttachmentPrimitiveRemove = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement>,
): JSX.Element => {
  const [local, rest] = splitProps(props, ["onClick"]);
  const aui = useAui();
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || rest.disabled) return;
        void aui.attachment.remove();
      },
    }),
  );
};
