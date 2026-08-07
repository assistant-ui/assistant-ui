import { computed, defineComponent, h, nextTick, type SlotsType } from "vue";
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
    // When the collection shrinks, this scope re-resolves before Vue unmounts
    // it; serve the last valid clients for that window only. A stale serve
    // drops the caches after Vue's flush, so a provider still mounted out of
    // bounds reverts to throwing on its next resolution, while a normal
    // shrink has unmounted it by then.
    const config = computed(() => {
      const index = props.index;
      let lastMessage: MessageMethods | undefined;
      let lastComposer: ComposerMethods | undefined;
      let recheckScheduled = false;
      const scheduleRecheck = () => {
        if (recheckScheduled) return;
        recheckScheduled = true;
        void nextTick(() => {
          recheckScheduled = false;
          lastMessage = undefined;
          lastComposer = undefined;
        });
      };
      return AuiConfig({
        message: Derived({
          source: "thread",
          query: { type: "index", index },
          get: (aui) => {
            if (index < aui.thread.getState().messages.length) {
              lastMessage = aui.thread.message({ index });
            } else if (lastMessage) {
              scheduleRecheck();
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
            } else if (lastComposer) {
              scheduleRecheck();
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
