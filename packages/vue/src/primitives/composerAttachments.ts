import {
  defineComponent,
  h,
  mergeProps,
  ref,
  type SlotsType,
  type VNodeChild,
} from "vue";
import { isAttrDisabled } from "./attrDisabled";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";

/**
 * Renders the composer's pending attachments in order, each scoped through
 * {@link AttachmentByIndexProvider}; the `default` slot renders each
 * attachment.
 */
export const ComposerPrimitiveAttachments = defineComponent({
  name: "ComposerPrimitiveAttachments",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const attachments = useAuiState((s) => s.composer.attachments);
    return () =>
      attachments.value.map((attachment, index) =>
        h(
          AttachmentByIndexProvider,
          { source: "composer", index, key: attachment.id },
          { default: () => slots.default?.() },
        ),
      );
  },
});

/**
 * A button that opens a file picker and adds the selected files to the
 * composer. Disabled while the composer is not editable. The picker's accept
 * filter follows the composer's `attachmentAccept`.
 */
export const ComposerPrimitiveAddAttachment = defineComponent({
  name: "ComposerPrimitiveAddAttachment",
  inheritAttrs: false,
  props: {
    multiple: {
      type: Boolean,
      default: true,
    },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { attrs, slots }) {
    const aui = useAui();
    const disabled = useAuiState((s) => !s.composer.isEditing);
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || disabled.value || isAttrDisabled(attrs))
        return;

      const input = document.createElement("input");
      input.type = "file";
      input.multiple = props.multiple;
      input.hidden = true;

      const attachmentAccept = aui.composer.getState().attachmentAccept;
      if (attachmentAccept !== "*") {
        input.accept = attachmentAccept;
      }

      document.body.appendChild(input);

      input.onchange = (e) => {
        const fileList = (e.target as HTMLInputElement).files;
        if (fileList) {
          for (const file of Array.from(fileList)) {
            aui.composer.addAttachment(file).catch(() => {});
          }
        }
        input.remove();
      };
      input.oncancel = () => input.remove();

      input.click();
    };
    return () =>
      h(
        "button",
        mergeProps(attrs, {
          type: "button",
          disabled: disabled.value || isAttrDisabled(attrs),
          onClick,
        }),
        slots.default?.(),
      );
  },
});

/**
 * A drop target that adds dropped files to the composer. `data-dragging` is
 * present while a file drag hovers the element. File drags are claimed via
 * `preventDefault` even when the runtime does not support attachments, since
 * an unprevented file drop navigates the tab to the file.
 */
export const ComposerPrimitiveAttachmentDropzone = defineComponent({
  name: "ComposerPrimitiveAttachmentDropzone",
  inheritAttrs: false,
  props: {
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(props, { attrs, slots }) {
    const aui = useAui();
    const isDragging = ref(false);

    const isFileDrag = (event: DragEvent) =>
      event.dataTransfer?.types.includes("Files") === true;

    const onDragenterCapture = (event: DragEvent) => {
      if (props.disabled || !isFileDrag(event)) return;
      event.preventDefault();
      if (!aui.thread.getState().capabilities.attachments) {
        event.dataTransfer!.dropEffect = "none";
        return;
      }
      isDragging.value = true;
    };
    const onDragoverCapture = (event: DragEvent) => {
      if (props.disabled || !isFileDrag(event)) return;
      event.preventDefault();
      if (!aui.thread.getState().capabilities.attachments) {
        event.dataTransfer!.dropEffect = "none";
        return;
      }
      if (!isDragging.value) isDragging.value = true;
    };
    const onDragleaveCapture = (event: DragEvent) => {
      if (props.disabled || !isFileDrag(event)) return;
      const related = event.relatedTarget as Node | null;
      if (related && (event.currentTarget as Node).contains(related)) return;
      isDragging.value = false;
    };
    const onDropCapture = (event: DragEvent) => {
      if (props.disabled) return;
      isDragging.value = false;
      if (!isFileDrag(event)) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (!aui.thread.getState().capabilities.attachments || files.length === 0)
        return;
      for (const file of files) {
        aui.composer.addAttachment(file).catch(() => {});
      }
    };

    return () =>
      h(
        "div",
        mergeProps(attrs, {
          ...(isDragging.value && { "data-dragging": "true" }),
          onDragenterCapture,
          onDragoverCapture,
          onDragleaveCapture,
          onDropCapture,
        }),
        slots.default?.(),
      );
  },
});
