import type { StateCreator } from "zustand";

export type BaseComposerState = Readonly<{
  value: string;
  setValue: (value: string) => void;
}>;

export const makeBaseComposer: StateCreator<
  BaseComposerState,
  [],
  [],
  BaseComposerState
> = (set) => ({
  value: "",
  setValue: (value) => {
    set({ value });
  },
});
