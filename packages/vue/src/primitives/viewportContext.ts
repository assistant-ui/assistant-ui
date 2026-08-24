import type { InjectionKey, ShallowRef } from "vue";

export type ViewportContext = {
  isAtBottom: ShallowRef<boolean>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
};

export const viewportInjectionKey: InjectionKey<ViewportContext> = Symbol(
  "assistant-ui.vue.viewport",
);
