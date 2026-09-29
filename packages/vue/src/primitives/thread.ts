import {
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onScopeDispose,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { useAui } from "../useAui";

/**
 * A wrapper element for the thread. While mounted, Escape stops an active
 * speech synthesis run.
 */
export const ThreadPrimitiveRoot = defineComponent({
  name: "ThreadPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (aui.thread.source === null) return;
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
    };
    onMounted(() => {
      document.addEventListener("keydown", handleKeyDown);
    });
    onScopeDispose(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
    return () => h("div", mergeProps(attrs, {}), slots.default?.());
  },
});
