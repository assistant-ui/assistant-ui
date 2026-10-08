"use client";

import {
  useEffect,
  useRef,
  forwardRef,
  type ComponentType,
  type ForwardedRef,
  type PropsWithoutRef,
  useId,
  createContext,
  useContext,
} from "react";
import { useAui } from "@assistant-ui/store";
import { useComposedRefs } from "radix-ui/internal";
import { tool } from "@assistant-ui/core";

const DEFAULT_ACTION_SETTLE_DELAY_MS = 2000;
const MAX_ACTION_SETTLE_DELAY_MS = 2_147_483_647;

const waitForSettle = async (settleDelayMs: number) => {
  const delay =
    Number.isFinite(settleDelayMs) &&
    settleDelayMs >= 0 &&
    settleDelayMs <= MAX_ACTION_SETTLE_DELAY_MS
      ? settleDelayMs
      : DEFAULT_ACTION_SETTLE_DELAY_MS;
  if (delay === 0) return;
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
};

const readActionSettleDelay = (element: HTMLElement) => {
  const value = element.dataset.actionSettleDelay;
  return value === undefined || value.trim() === ""
    ? DEFAULT_ACTION_SETTLE_DELAY_MS
    : Number(value);
};

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
      await waitForSettle(readActionSettleDelay(el));
      return {};
    } else {
      return "Element not found";
    }
  },
});

const setNativeValue = (
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
};

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
      setNativeValue(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      await waitForSettle(readActionSettleDelay(el));
      return {};
    } else {
      return "Element not found";
    }
  },
});

const ReadableContext = createContext<boolean>(false);

export const makeAssistantVisible = <T extends ComponentType<any>>(
  Component: T,
  config?: {
    clickable?: boolean | undefined;
    editable?: boolean | undefined;
    settleDelayMs?: number | undefined;
  },
) => {
  const settleDelayMs = config?.settleDelayMs ?? DEFAULT_ACTION_SETTLE_DELAY_MS;
  if (
    !Number.isFinite(settleDelayMs) ||
    settleDelayMs < 0 ||
    settleDelayMs > MAX_ACTION_SETTLE_DELAY_MS
  ) {
    throw new RangeError(
      `settleDelayMs must be between 0 and ${MAX_ACTION_SETTLE_DELAY_MS}`,
    );
  }

  const ReadableComponent = forwardRef(
    (props: PropsWithoutRef<T>, outerRef: ForwardedRef<any>) => {
      const isNestedReadable = useContext(ReadableContext);

      const clickId = useId();
      const componentRef = useRef<HTMLElement>(null);

      const aui = useAui();

      const { clickable, editable } = config ?? {};
      useEffect(() => {
        return aui.modelContext.register({
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
            {...(config?.settleDelayMs !== undefined &&
            (config.clickable || config.editable)
              ? { "data-action-settle-delay": settleDelayMs }
              : {})}
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
