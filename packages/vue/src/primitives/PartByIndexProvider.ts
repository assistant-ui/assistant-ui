import { computed, defineComponent, h, nextTick, type SlotsType } from "vue";
import { AuiConfig, Derived } from "@assistant-ui/store/client";
import type { PartMethods } from "@assistant-ui/core/store";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";

/**
 * Scopes the subtree to the message part at `index`: descendants read the
 * part through `s.part`.
 */
export const PartByIndexProvider = defineComponent({
  name: "PartByIndexProvider",
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
    // it; serve the last valid client for that window only. A stale serve
    // drops the cache after Vue's flush, so a provider still mounted out of
    // bounds reverts to throwing on its next resolution, while a normal
    // shrink has unmounted it by then.
    const config = computed(() => {
      const index = props.index;
      let lastPart: PartMethods | undefined;
      let recheckScheduled = false;
      const scheduleRecheck = () => {
        if (recheckScheduled) return;
        recheckScheduled = true;
        void nextTick(() => {
          recheckScheduled = false;
          lastPart = undefined;
        });
      };
      return AuiConfig({
        part: Derived({
          source: "message",
          query: { type: "index", index },
          get: (aui) => {
            if (index < aui.message.getState().parts.length) {
              lastPart = aui.message.part({ index });
            } else if (lastPart) {
              scheduleRecheck();
            }
            return lastPart ?? aui.message.part({ index });
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
