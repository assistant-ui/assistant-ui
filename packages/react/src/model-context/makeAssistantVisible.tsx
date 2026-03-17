"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  ComponentType,
  ForwardedRef,
  PropsWithoutRef,
  useId,
  createContext,
  useContext,
} from "react";
import { useAui } from "@assistant-ui/store";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { tool } from "@assistant-ui/core";

const click = tool({
  parameters: {
    type: "object",
    properties: {
      clickId: {
        type: "string",
      },
    },
    required: ["clickId"],
  },
  execute: async ({ clickId }: { clickId: string }) => {
    const escapedClickId = CSS.escape(clickId);
    const el = document.querySelector(`[data-click-id='${escapedClickId}']`);
    if (el instanceof HTMLElement) {
      el.click();

      // todo make adjustable
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {};
    } else {
      return "Element not found";
    }
  },
});

const edit = tool({
  parameters: {
    type: "object",
    properties: {
      editId: {
        type: "string",
      },
      value: {
        type: "string",
      },
    },
    required: ["editId", "value"],
  },
  execute: async ({ editId, value }: { editId: string; value: string }) => {
    const escapedEditId = CSS.escape(editId);
    const el = document.querySelector(`[data-edit-id='${escapedEditId}']`);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      // todo make adjustable
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {};
    } else {
      return "Element not found";
    }
  },
});

const ReadableContext = createContext<boolean>(false);

export const makeAssistantVisible = <T extends ComponentType<any>>(
  Component: T,
  config?: { clickable?: boolean | undefined; editable?: boolean | undefined },
) => {
  const ReadableComponent = forwardRef(
    (props: PropsWithoutRef<T>, outerRef: ForwardedRef<any>) => {
      const isNestedReadable = useContext(ReadableContext);

      const clickId = useId();
      const componentRef = useRef<HTMLElement>(null);

      const aui = useAui();

      const { clickable, editable } = config ?? {};
      useEffect(() => {
        return aui.modelContext().register({
          getModelContext: () => {
            return {
              tools: {
                ...(clickable ? { click } : {}),
                ...(editable ? { edit } : {}),
              },
              system: !isNestedReadable // only pass content if this readable isn't nested in another readable
                ? componentRef.current?.outerHTML
                : undefined,
            };
          },
        });
      }, [isNestedReadable, aui, clickable, editable]);

      const ref = useComposedRefs(componentRef, outerRef);

      return (
        <ReadableContext.Provider value={true}>
          <Component
            {...(props as any)}
            {...(config?.clickable ? { "data-click-id": clickId } : {})}
            {...(config?.editable ? { "data-edit-id": clickId } : {})}
            ref={ref}
          />
        </ReadableContext.Provider>
      );
    },
  );

  ReadableComponent.displayName = Component.displayName;

  return ReadableComponent as unknown as T;
};

export default makeAssistantVisible;
