import { computed, defineComponent, h, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { ComposerMethods, MessageMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

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
  slots: Object as SlotsType<{ default?: () => unknown }>,
  setup(props, { slots }) {
    const aui = useAui();
    const config = computed(() => {
      const index = props.index;
      // When the collection shrinks, this scope re-resolves before Vue
      // unmounts it; serve the last valid clients for that window. A
      // never-valid index falls through and still throws.
      let lastMessage: MessageMethods | undefined;
      let lastComposer: ComposerMethods | undefined;
      return AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "index", index },
          get: (aui) => {
            if (index < aui.thread.getState().messages.length) {
              lastMessage = aui.thread.message({ index });
            }
            return lastMessage ?? aui.thread.message({ index });
          },
        }),
        composer: Derived({
          source: "message",
          query: {},
          get: (aui) => {
            if (index < aui.thread.getState().messages.length) {
              lastComposer = aui.thread.message({ index }).composer();
            }
            return lastComposer ?? aui.thread.message({ index }).composer();
          },
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
