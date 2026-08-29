import {
  computed,
  defineComponent,
  h,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { ComposerMethods, MessageMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { createLastValidCache, createStaleReporter } from "./lastValidCache";

/**
 * Scopes the subtree to the thread message at `index`: descendants read the
 * message through `s.message` and its edit composer through `s.composer`.
 */
export const MessageByIndexProvider = defineComponent({
  name: "MessageByIndexProvider",
  props: {
    index: {
      type: Number,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { slots }) {
    const aui = useAui();
    let disposed = false;
    onScopeDispose(() => {
      disposed = true;
    });
    const config = computed(() => {
      const index = props.index;
      const messageCache = createLastValidCache<MessageMethods>(
        createStaleReporter({
          name: "MessageByIndexProvider",
          index,
          isCurrent: () => !disposed && index === props.index,
          isValid: () => index < aui.thread.getState().messages.length,
        }),
      );
      const composerCache = createLastValidCache<ComposerMethods>(null);
      return AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "index", index },
          get: (aui) =>
            messageCache.resolve(
              index < aui.thread.getState().messages.length,
              () => aui.thread.message({ index }),
            ),
        }),
        composer: Derived({
          source: "message",
          query: {},
          get: (aui) =>
            composerCache.resolve(
              index < aui.thread.getState().messages.length,
              () => aui.thread.message({ index }).composer(),
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
