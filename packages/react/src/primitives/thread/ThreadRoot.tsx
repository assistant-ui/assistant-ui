"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ComponentRef,
  forwardRef,
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
} from "react";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
import { useAui } from "@assistant-ui/store";

const threadRootsByDocument = new WeakMap<
  Document,
  Set<ThreadPrimitiveRoot.Element>
>();
const activeThreadRootByDocument = new WeakMap<
  Document,
  ThreadPrimitiveRoot.Element
>();

const isEscapeTargetForRoot = (
  event: KeyboardEvent,
  root: ThreadPrimitiveRoot.Element,
) => {
  const ownerDocument = root.ownerDocument;
  const roots = threadRootsByDocument.get(ownerDocument);
  if (roots?.size === 1) return true;

  const NodeConstructor = ownerDocument.defaultView?.Node;

  if (NodeConstructor && event.target instanceof NodeConstructor) {
    if (root.contains(event.target)) {
      return !Array.from(roots ?? []).some(
        (otherRoot) =>
          otherRoot !== root &&
          root.contains(otherRoot) &&
          otherRoot.contains(event.target as Node),
      );
    }
  }

  if (event.target !== ownerDocument && event.target !== ownerDocument.body) {
    return false;
  }

  const activeRoot = activeThreadRootByDocument.get(ownerDocument);
  return activeRoot ? activeRoot === root : roots?.size === 1;
};

export namespace ThreadPrimitiveRoot {
  export type Element = ComponentRef<typeof Primitive.div>;
  /**
   * Props for the ThreadPrimitive.Root component.
   * Accepts all standard div element props.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * The root container component for a thread.
 *
 * This component serves as the foundational wrapper for all thread-related components.
 * It provides the basic structure and context needed for thread functionality.
 *
 * @example
 * ```tsx
 * <ThreadPrimitive.Root>
 *   <ThreadPrimitive.Viewport>
 *     <ThreadPrimitive.Messages>
 *       {() => <MyMessage />}
 *     </ThreadPrimitive.Messages>
 *   </ThreadPrimitive.Viewport>
 * </ThreadPrimitive.Root>
 * ```
 */
export const ThreadPrimitiveRoot = forwardRef<
  ThreadPrimitiveRoot.Element,
  ThreadPrimitiveRoot.Props
>((props, ref) => {
  const aui = useAui();
  const rootRef = useRef<ThreadPrimitiveRoot.Element>(null);
  const composedRef = useComposedRefs(ref, rootRef);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ownerDocument = root.ownerDocument;
    const roots =
      threadRootsByDocument.get(ownerDocument) ??
      new Set<ThreadPrimitiveRoot.Element>();
    threadRootsByDocument.set(ownerDocument, roots);
    roots.add(root);

    const markActive = () => {
      activeThreadRootByDocument.set(ownerDocument, root);
    };
    root.addEventListener("focusin", markActive);
    root.addEventListener("pointerdown", markActive);

    return () => {
      root.removeEventListener("focusin", markActive);
      root.removeEventListener("pointerdown", markActive);
      roots.delete(root);
      if (roots.size === 0) threadRootsByDocument.delete(ownerDocument);
      if (activeThreadRootByDocument.get(ownerDocument) === root) {
        activeThreadRootByDocument.delete(ownerDocument);
      }
    };
  }, []);

  useEscapeKeydown((event) => {
    if (event.defaultPrevented || aui.thread.source === null) return;
    const root = rootRef.current;
    if (!root || !isEscapeTargetForRoot(event, root)) return;
    if (aui.thread.getState().speech == null) return;
    event.preventDefault();
    try {
      aui.thread.stopSpeaking();
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "No message is being spoken"
      ) {
        throw error;
      }
    }
  });

  return <Primitive.div {...props} ref={composedRef} />;
});

ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
