import {
  defineComponent,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from "vue";
import type { AssistantState } from "@assistant-ui/store/client";
import { useAuiState } from "./useAuiState";

/**
 * Renders the default slot while `condition` selects `true` from the
 * assistant state.
 *
 * @example
 * ```html
 * <AuiIf :condition="(s) => s.thread.isRunning">
 *   <StopButton />
 * </AuiIf>
 * ```
 */
export const AuiIf = defineComponent({
  name: "AuiIf",
  props: {
    condition: {
      type: Function as PropType<(state: AssistantState) => boolean>,
      required: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { slots }) {
    const active = useAuiState((state) => props.condition(state));
    return () => (active.value ? slots.default?.() : null);
  },
});
