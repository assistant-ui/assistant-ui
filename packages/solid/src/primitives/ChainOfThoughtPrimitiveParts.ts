import {
  createComponent,
  createMemo,
  For,
  onCleanup,
  type Accessor,
  type JSX,
} from "solid-js";
import { getMessagePartKeys } from "@assistant-ui/core/internal";
import type { PartMethods, PartState } from "@assistant-ui/core/store";
import {
  AuiConfig,
  Derived,
  createLastValidCache,
  createStaleReporter,
} from "@assistant-ui/store/client";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

const ChainOfThoughtPartByIndexProvider = (props: {
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
        name: "ChainOfThoughtPartByIndexProvider",
        index,
        isCurrent: () => !disposed && index === props.index,
        isValid: () => index < aui.chainOfThought.getState().parts.length,
      }),
      queueMicrotask,
    );
    return AuiConfig({
      part: Derived({
        source: "chainOfThought",
        query: { type: "index", index },
        get: (aui) => {
          const valid = index < aui.chainOfThought.getState().parts.length;
          // Userland getMessagePart can throw even when parts.length includes the index.
          try {
            return cache.resolve(valid, () =>
              aui.chainOfThought.part({ index }),
            );
          } catch (error) {
            return cache.resolve(false, () => {
              throw error;
            });
          }
        },
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

/**
 * Renders the parts within a chain of thought through the children function,
 * called once per entry of `s.chainOfThought.parts` with that part.
 *
 * Rendering is not gated on `s.chainOfThought.collapsed`; gate visibility in
 * the caller (for example with `<Show>`), matching the React primitive.
 */
export const ChainOfThoughtPrimitiveParts = (props: {
  children?: (part: Accessor<PartState>) => JSX.Element;
}): JSX.Element => {
  const partKeys = useAuiState((s) =>
    getMessagePartKeys(s.chainOfThought.parts),
  );
  const PartView = (): JSX.Element => {
    const part = useAuiState((s) => s.part);
    return props.children?.(part);
  };
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return partKeys();
    },
    children: (_key, index) =>
      createComponent(ChainOfThoughtPartByIndexProvider, {
        get index() {
          return index();
        },
        get children() {
          return createComponent(PartView, {});
        },
      }),
  });
};
