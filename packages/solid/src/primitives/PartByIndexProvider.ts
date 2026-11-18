import { createComponent, createMemo, onCleanup, type JSX } from "solid-js";
import {
  AuiConfig,
  Derived,
  createLastValidCache,
  createStaleReporter,
} from "@assistant-ui/store/client";
import type { PartMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

/** Scopes the subtree to the message part at `index`: descendants read the part through `s.part`. */
export const PartByIndexProvider = (props: {
  index: number;
  children?: JSX.Element;
}): JSX.Element => {
  const aui = useAui();
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });
  const config = createMemo(() => {
    const index = props.index;
    const cache = createLastValidCache<PartMethods>(
      createStaleReporter({
        name: "PartByIndexProvider",
        index,
        isCurrent: () => !disposed && index === props.index,
        isValid: () => index < aui.message.getState().parts.length,
      }),
      queueMicrotask,
    );
    return AuiConfig({
      part: Derived({
        source: "message",
        query: { type: "index", index },
        get: (aui) =>
          cache.resolve(index < aui.message.getState().parts.length, () =>
            aui.message.part({ index }),
          ),
      }),
    });
  });
  return createComponent(AuiProvider, {
    get config() {
      return config();
    },
    extends: aui,
    get children() {
      return props.children;
    },
  });
};
