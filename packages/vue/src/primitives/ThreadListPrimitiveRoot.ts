import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { provideThreadListCollection } from "./threadListFocusGroup";

export const ThreadListPrimitiveRoot = defineComponent({
  name: "ThreadListPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    provideThreadListCollection();
    return () => h("div", mergeProps(attrs), slots.default?.());
  },
});
