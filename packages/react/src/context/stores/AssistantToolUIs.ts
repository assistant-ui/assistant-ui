"use client";

import { create } from "zustand";
import type { ToolCallContentPartComponent } from "../../types/ContentPartComponentTypes";

export type AssistantToolUIsState = Readonly<{
  getToolUI: (toolName: string) => ToolCallContentPartComponent | null;
  setToolUI: (
    toolName: string,
    render: ToolCallContentPartComponent,
  ) => () => void;
}>;

export const makeAssistantToolUIsStore = () =>
  create<AssistantToolUIsState>((set) => {
    const renderers = new Map<string, ToolCallContentPartComponent[]>();

    return Object.freeze({
      getToolUI: (name) => {
        const arr = renderers.get(name);
        const last = arr?.at(-1);
        if (last) return last;
        return null;
      },
      setToolUI: (name, render) => {
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
          if (index === arr.length) {
            set({}); // notify the store listeners
          }
        };
      },
    }) satisfies AssistantToolUIsState;
  });
