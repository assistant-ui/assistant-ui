"use client";

import { create } from "zustand";
import type { ToolRenderComponent } from "../../model-config/ToolRenderComponent";

export type AssistantToolRenderersState = {
  // biome-ignore lint/suspicious/noExplicitAny: intentional any
  getToolRenderer: (name: string) => ToolRenderComponent<any, any> | null;
  setToolRenderer: (
    name: string,
    // biome-ignore lint/suspicious/noExplicitAny: intentional any
    render: ToolRenderComponent<any, any>,
  ) => () => void;
};

export const makeAssistantToolRenderersStore = () =>
  create<AssistantToolRenderersState>((set) => {
    // biome-ignore lint/suspicious/noExplicitAny: intentional any
    const renderers = new Map<string, ToolRenderComponent<any, any>[]>();

    return {
      getToolRenderer: (name) => {
        const arr = renderers.get(name);
        const last = arr?.at(-1);
        if (last) return last;
        return null;
      },
      setToolRenderer: (name, render) => {
        let arr = renderers.get(name);
        if (!arr) {
          arr = [];
          renderers.set(name, arr);
        }
        arr.push(render);
        set({}); // notify the store listeners

        return () => {
          const index = arr.indexOf(render);
          if (index !== -1) {
            arr.splice(index, 1);
          }
          set({}); // notify the store listeners
        };
      },
    } satisfies AssistantToolRenderersState;
  });
