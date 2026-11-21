import {
  createComponent,
  createComputed,
  createSignal,
  For,
  mergeProps,
  onCleanup,
  splitProps,
  type JSX,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { getAttachmentKeys } from "@assistant-ui/core/internal";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";
import { callEventHandler } from "./callEventHandler";

/**
 * Renders the composer's pending attachments in order, each scoped through
 * {@link AttachmentByIndexProvider}; the children render once per
 * attachment.
 */
export const ComposerPrimitiveAttachments = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const keys = useAuiState((s) => getAttachmentKeys(s.composer.attachments));
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return keys();
    },
    children: (_key, index) =>
      createComponent(AttachmentByIndexProvider, {
        source: "composer",
        get index() {
          return index();
        },
        get children() {
          return props.children;
        },
      }),
  });
};

/**
 * A button that opens a file picker and adds the selected files to the
 * composer. Disabled while the thread is disabled or the composer is not
 * editable. The picker's accept filter follows the composer's `attachmentAccept`.
 */
export const ComposerPrimitiveAddAttachment = (
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & { multiple?: boolean },
): JSX.Element => {
  const [local, rest] = splitProps(props, ["multiple", "onClick"]);
  const aui = useAui();
  const threadId = useAuiState((s) => s.optional.threads?.mainThreadId);
  const disabled = useAuiState(
    (s) => s.thread.isDisabled || !s.composer.isEditing,
  );
  let generation = 0;
  const pickers = new Set<HTMLInputElement>();
  createComputed(() => {
    threadId();
    generation++;
  });
  onCleanup(() => {
    generation++;
    pickers.forEach((input) => input.remove());
  });
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "button",
      type: "button" as const,
      get disabled() {
        return disabled() || rest.disabled;
      },
      onClick: (
        event: MouseEvent & {
          currentTarget: HTMLButtonElement;
          target: Element;
        },
      ) => {
        callEventHandler(local.onClick, event);
        if (event.defaultPrevented || disabled() || rest.disabled) return;
        const pickerGeneration = generation;
        const input = document.createElement("input");
        pickers.add(input);
        const remove = () => {
          input.remove();
          pickers.delete(input);
        };
        input.type = "file";
        input.multiple = local.multiple ?? true;
        input.hidden = true;
        const accept = aui.composer.getState().attachmentAccept;
        if (accept !== "*") input.accept = accept;
        document.body.appendChild(input);
        input.onchange = () => {
          if (input.files && generation === pickerGeneration) {
            for (const file of Array.from(input.files))
              aui.composer.addAttachment(file).catch(() => {});
          }
          remove();
        };
        input.oncancel = remove;
        input.click();
      },
    }),
  );
};

/**
 * A drop target that adds dropped files to the composer. `data-dragging` is
 * present while a file drag hovers the element. File drags are claimed via
 * `preventDefault` even when the runtime does not support attachments, since
 * an unprevented file drop navigates the tab to the file.
 */
export const ComposerPrimitiveAttachmentDropzone = (
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    disabled?: boolean;
    "data-dragging"?: string;
  } & {
    [
      K in `oncapture:${"dragenter" | "dragover" | "dragleave" | "drop"}`
    ]?: JSX.EventHandler<HTMLDivElement, DragEvent>;
  },
): JSX.Element => {
  const [local, rest] = splitProps(props, [
    "disabled",
    "oncapture:dragenter",
    "oncapture:dragover",
    "oncapture:dragleave",
    "oncapture:drop",
    "data-dragging",
  ]);
  const aui = useAui();
  const [dragging, setDragging] = createSignal(false);
  const supported = useAuiState(
    (s) => !s.thread.isDisabled && s.thread.capabilities.attachments,
  );
  createComputed(() => {
    if (local.disabled || !supported()) setDragging(false);
  });
  type Drag = DragEvent & { currentTarget: HTMLDivElement; target: Element };
  const isFileDrag = (event: Drag) =>
    event.dataTransfer?.types.includes("Files") === true;
  const hover = (
    handler: JSX.EventHandlerUnion<HTMLDivElement, DragEvent> | undefined,
    event: Drag,
  ) => {
    callEventHandler(handler, event);
    if (event.defaultPrevented || local.disabled || !isFileDrag(event)) return;
    event.preventDefault();
    if (!supported()) {
      event.dataTransfer!.dropEffect = "none";
      return;
    }
    setDragging(true);
  };
  return createComponent(
    Dynamic,
    mergeProps(rest, {
      component: "div",
      get "data-dragging"() {
        return !local.disabled && supported() && dragging()
          ? "true"
          : local["data-dragging"];
      },
      "oncapture:dragenter": (event: Drag) =>
        hover(local["oncapture:dragenter"], event),
      "oncapture:dragover": (event: Drag) =>
        hover(local["oncapture:dragover"], event),
      "oncapture:dragleave": (event: Drag) => {
        callEventHandler(local["oncapture:dragleave"], event);
        if (local.disabled || !isFileDrag(event)) return;
        if (
          event.relatedTarget &&
          event.currentTarget.contains(event.relatedTarget as Node)
        )
          return;
        setDragging(false);
      },
      "oncapture:drop": (event: Drag) => {
        callEventHandler(local["oncapture:drop"], event);
        if (local.disabled || !isFileDrag(event)) return;
        setDragging(false);
        if (event.defaultPrevented) return;
        event.preventDefault();
        if (!supported()) return;
        for (const file of Array.from(event.dataTransfer?.files ?? []))
          aui.composer.addAttachment(file).catch(() => {});
      },
    }),
  );
};
