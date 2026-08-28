import {
  defineComponent,
  h,
  mergeProps,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

/** A wrapper element scoped to the current attachment. */
export const AttachmentPrimitiveRoot = defineComponent({
  name: "AttachmentPrimitiveRoot",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    return () => h("div", mergeProps(attrs, {}), slots.default?.());
  },
});

/** Renders the current attachment's file name as raw text. */
export const AttachmentPrimitiveName = defineComponent({
  name: "AttachmentPrimitiveName",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const name = useAuiState((s) => s.attachment.name);
    return () => slots.default?.() ?? name.value;
  },
});

/**
 * Renders a short label for the current attachment: the file extension when
 * the name has one, otherwise the attachment type.
 */
export const AttachmentPrimitiveThumb = defineComponent({
  name: "AttachmentPrimitiveThumb",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const label = useAuiState((s) => {
      const name = s.attachment.name;
      const dot = name.lastIndexOf(".");
      if (dot > 0 && dot < name.length - 1) {
        return `.${name.slice(dot + 1)}`;
      }
      return s.attachment.type;
    });
    return () =>
      h("div", mergeProps(attrs, {}), slots.default?.() ?? label.value);
  },
});

/** A button that removes the current attachment. */
export const AttachmentPrimitiveRemove = defineComponent({
  name: "AttachmentPrimitiveRemove",
  inheritAttrs: false,
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { attrs, slots }) {
    const aui = useAui();
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isAttrDisabled(attrs)) return;
      void aui.attachment.remove();
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: isAttrDisabled(attrs),
          onClick,
        }),
        slots.default?.(),
      );
  },
});
