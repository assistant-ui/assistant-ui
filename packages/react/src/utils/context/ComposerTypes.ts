import type { StoreApi, UseBoundStore } from "zustand";

export type ComposerState = {
  isEditing: boolean;
  canCancel: boolean;

  edit: () => void;
  send: () => void;
  cancel: () => void;

  value: string;
  setValue: (value: string) => void;
};

export type ComposerStore = {
  useComposer: UseBoundStore<StoreApi<ComposerState>>;
};
