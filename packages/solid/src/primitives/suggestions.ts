import {
  createComponent,
  createMemo,
  For,
  mergeProps,
  onCleanup,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  AuiConfig,
  Derived,
  createLastValidCache,
  createStaleReporter,
} from "@assistant-ui/store/client";
import { flushTapSync } from "@assistant-ui/tap";
import type { SuggestionMethods } from "@assistant-ui/core/store";
import { getSuggestionKeys } from "@assistant-ui/core/internal";
import {
  suggestionSendMode,
  suggestionTriggerDisabled,
} from "@assistant-ui/core/store/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

/**
 * Scopes the subtree to the suggestion at `index`: descendants read it
 * through `s.suggestion`.
 */
export const SuggestionByIndexProvider = (props: {
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
    const cache = createLastValidCache<SuggestionMethods>(
      createStaleReporter({
        name: "SuggestionByIndexProvider",
        index,
        isCurrent: () => !disposed && index === props.index,
        isValid: () => index < aui.suggestions.getState().suggestions.length,
      }),
      queueMicrotask,
    );
    return AuiConfig({
      suggestion: Derived({
        source: "suggestions",
        query: { index },
        get: (aui) =>
          cache.resolve(
            index < aui.suggestions.getState().suggestions.length,
            () => aui.suggestions.suggestion({ index }),
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

/**
 * Renders the children once per thread suggestion, each instance scoped
 * through {@link SuggestionByIndexProvider}.
 */
export const ThreadPrimitiveSuggestions = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const keys = useAuiState((s) => getSuggestionKeys(s.suggestions.suggestions));
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return keys();
    },
    children: (_key, index) =>
      createComponent(SuggestionByIndexProvider, {
        get index() {
          return index();
        },
        get children() {
          return props.children;
        },
      }),
  });
};

/**
 * A button that triggers the current suggestion. With `send`, the prompt is
 * appended as a message (queued sends never clear a draft the user is still
 * composing); without it, the prompt replaces the composer text, or is
 * appended to it when `clearComposer` is false.
 */
export const SuggestionPrimitiveTrigger = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    send?: boolean;
    clearComposer?: boolean;
  },
): JSX.Element => {
  const [local, rest] = splitProps(props, ["send", "clearComposer", "onClick"]);
  const aui = useAui();
  const prompt = useAuiState((s) => s.suggestion.prompt);
  const disabled = useAuiState((s) =>
    suggestionTriggerDisabled(s, local.send ?? false),
  );

  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get disabled() {
        return disabled() || rest.disabled;
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || disabled() || rest.disabled) return;
        flushTapSync(() => {
          if (local.send) {
            const mode = suggestionSendMode(aui.thread.getState());
            if (mode === "blocked") return;
            aui.thread.append({
              content: [{ type: "text", text: prompt() }],
              runConfig: aui.composer.getState().runConfig,
            });
            if (local.clearComposer !== false && mode === "now") {
              aui.composer.setText("");
            }
          } else if (local.clearComposer !== false) {
            aui.composer.setText(prompt());
          } else {
            const currentText = aui.composer.getState().text;
            aui.composer.setText(
              [currentText, prompt()].filter((part) => part.trim()).join(" "),
            );
          }
        });
      },
    }),
  );
};

/** Renders the current suggestion's title as text. */
export const SuggestionPrimitiveTitle = (): JSX.Element =>
  useAuiState((s) => s.suggestion.title) as unknown as JSX.Element;

/** Renders the current suggestion's label as text. */
export const SuggestionPrimitiveDescription = (): JSX.Element =>
  useAuiState((s) => s.suggestion.label) as unknown as JSX.Element;
