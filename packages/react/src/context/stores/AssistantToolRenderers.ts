"use client";

import { create } from "zustand";
import type { ToolCallContentPartComponent } from "../../primitives/message/ContentPartComponentTypes";

export type AssistantToolRenderersState = {
  getToolRenderer: (name: string) => ToolCallContentPartComponent | null;
  setToolRenderer: (
    name: string,
    render: ToolCallContentPartComponent,
  ) => () => void;
};

export const makeAssistantToolRenderersStore = () =>
  create<AssistantToolRenderersState>((set) => {
    const renderers = new Map<string, ToolCallContentPartComponent[]>();

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
