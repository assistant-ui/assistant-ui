import { isCompositionKey } from "@assistant-ui/core/internal";
import {
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onScopeDispose,
  ref,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { useAui } from "../useAui";

const escapeEventThreadRoots = new WeakMap<Event, Element>();

/**
 * A wrapper element for the thread. While mounted, an unhandled Escape inside
 * this thread or outside every thread root stops its active speech synthesis
 * run; Escape inside another thread or during IME composition is ignored.
 */
export const ThreadPrimitiveRoot = defineComponent({
  name: "ThreadPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const root = ref<HTMLDivElement | null>(null);
    const handleRootKeydown = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        root.value &&
        !escapeEventThreadRoots.has(event)
      ) {
        escapeEventThreadRoots.set(event, root.value);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isCompositionKey(event)) return;
      if (event.defaultPrevented) return;
      if (aui.thread.source === null) return;
      const eventThreadRoot =
        escapeEventThreadRoots.get(event) ??
        event
          .composedPath()
          .find(
            (target) =>
              target instanceof Element &&
              target.hasAttribute("data-aui-thread-root"),
          );
      if (eventThreadRoot && eventThreadRoot !== root.value) return;
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
    return () =>
      h(
        "div",
        mergeProps(attrs, {
          "data-aui-thread-root": "",
          onKeydown: handleRootKeydown,
          ref: root,
        }),
        slots.default?.(),
      );
  },
});
