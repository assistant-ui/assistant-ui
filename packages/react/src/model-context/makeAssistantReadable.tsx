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
import { z } from "zod";
import { useAssistantRuntime } from "../context";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { tool } from "./tool";

const click = tool({
  parameters: z.object({
    clickId: z.string(),
  }),
  execute: async ({ clickId }) => {
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

const ReadableContext = createContext<boolean>(false);

export const makeAssistantReadable = <T extends ComponentType<any>>(
  Component: T,
  config?: { clickable?: boolean | undefined },
) => {
  const ReadableComponent = forwardRef(
    (props: PropsWithoutRef<T>, outerRef: ForwardedRef<any>) => {
      const isInReadable = useContext(ReadableContext);

      const clickId = useId();
      const componentRef = useRef<HTMLElement>(null);

      const assistant = useAssistantRuntime();
      useEffect(() => {
        return assistant.registerModelContextProvider({
          getModelContext: () => {
            return {
              ...(config?.clickable ? { tools: { click } } : {}),
              system: !isInReadable // only pass content if this readable isn't nested in another readable
                ? componentRef.current?.outerHTML
                : undefined,
            };
          },
        });
      }, [config?.clickable, isInReadable]);

      const ref = useComposedRefs(componentRef, outerRef);

      return (
        <ReadableContext.Provider value={true}>
          <Component
            {...(props as any)}
            {...(config?.clickable ? { "data-click-id": clickId } : {})}
            ref={ref}
          />
        </ReadableContext.Provider>
      );
    },
  );

  return ReadableComponent as unknown as T;
};

export default makeAssistantReadable;
