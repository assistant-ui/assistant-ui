import {
  computed,
  defineComponent,
  h,
  mergeProps,
  onScopeDispose,
  type SlotsType,
} from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import { flushTapSync } from "@assistant-ui/tap";
import type { SuggestionMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { isAttrDisabled } from "./attrDisabled";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/**
 * Scopes the subtree to the suggestion at `index`: descendants read it
 * through `s.suggestion`.
 */
export const SuggestionByIndexProvider = defineComponent({
  name: "SuggestionByIndexProvider",
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const aui = useAui();
    let disposed = false;
    onScopeDispose(() => {
      disposed = true;
    });
    const config = computed(() => {
      const index = props.index;
      const cache = createLastValidCache<SuggestionMethods>(
        createStaleReporter({
          name: "SuggestionByIndexProvider",
          index,
          isCurrent: () => !disposed && index === props.index,
          isValid: () => index < aui.suggestions.getState().suggestions.length,
        }),
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
    return () =>
      h(
        AuiProvider,
        { config: config.value, extends: aui },
        { default: () => slots.default?.() },
      );
  },
});

/**
 * Renders the default slot once per thread suggestion, each instance scoped
 * through {@link SuggestionByIndexProvider}.
 */
export const ThreadPrimitiveSuggestions = defineComponent({
  name: "ThreadPrimitiveSuggestions",
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(_, { slots }) {
    const count = useAuiState((s) => s.suggestions.suggestions.length);
    return () =>
      Array.from({ length: count.value }, (_, index) =>
        h(
          SuggestionByIndexProvider,
          { index, key: index },
          { default: () => slots.default?.() },
        ),
      );
  },
});

/**
 * A button that triggers the current suggestion. With `send`, the prompt is
 * appended as a message (queued sends never clear a draft the user is still
 * composing); without it, the prompt replaces the composer text, or is
 * appended to it when `clearComposer` is false.
 */
export const SuggestionPrimitiveTrigger = defineComponent({
  name: "SuggestionPrimitiveTrigger",
  inheritAttrs: false,
  props: {
    send: {
      type: Boolean,
      default: false,
    },
    clearComposer: {
      type: Boolean,
      default: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { attrs, slots }) {
    const aui = useAui();
    const prompt = useAuiState((s) => s.suggestion.prompt);
    const disabled = useAuiState(
      (s) =>
        s.thread.isDisabled ||
        (props.send && s.thread.isRunning && !s.thread.capabilities.queue),
    );

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;
      flushTapSync(() => {
        if (props.send) {
          const { isRunning, capabilities } = aui.thread.getState();
          if (isRunning && !capabilities.queue) return;
          aui.thread.append({
            content: [{ type: "text", text: prompt.value }],
            runConfig: aui.composer.getState().runConfig,
          });
          if (props.clearComposer && !isRunning) {
            aui.composer.setText("");
          }
        } else if (props.clearComposer) {
          aui.composer.setText(prompt.value);
        } else {
          const currentText = aui.composer.getState().text;
          aui.composer.setText(
            currentText.trim()
              ? `${currentText} ${prompt.value}`
              : prompt.value,
          );
        }
      });
    };

    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: disabled.value || isAttrDisabled(attrs),
          onClick,
        }),
        slots.default?.(),
      );
  },
});

/** Renders the current suggestion's title as text. */
export const SuggestionPrimitiveTitle = defineComponent({
  name: "SuggestionPrimitiveTitle",
  setup() {
    const title = useAuiState((s) => s.suggestion.title);
    return () => title.value;
  },
});

/** Renders the current suggestion's label as text. */
export const SuggestionPrimitiveDescription = defineComponent({
  name: "SuggestionPrimitiveDescription",
  setup() {
    const label = useAuiState((s) => s.suggestion.label);
    return () => label.value;
  },
});
