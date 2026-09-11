import type { InjectionKey, ShallowRef } from "vue";

export type ViewportContentInsetHandle = {
  setHeight: (height: number) => void;
  unregister: () => void;
};

export type ViewportContext = {
  isAtBottom: ShallowRef<boolean>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  registerContentInset: () => ViewportContentInsetHandle;
};

export const viewportInjectionKey: InjectionKey<ViewportContext> = Symbol(
  "assistant-ui.vue.viewport",
);
