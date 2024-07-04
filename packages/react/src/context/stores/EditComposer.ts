import { create } from "zustand";
import { type BaseComposerState, makeBaseComposer } from "./BaseComposer";
import { ReadonlyStore } from "../ReadonlyStore";

export type EditComposerState = BaseComposerState &
  Readonly<{
    canCancel: boolean;
    isEditing: boolean;

    edit: () => void;
    send: () => void;
    cancel: () => void;
  }>;

export const makeEditComposerStore = ({
  onEdit,
  onSend,
}: {
  onEdit: () => string;
  onSend: (value: string) => void;
}): ReadonlyStore<EditComposerState> =>
  create<EditComposerState>()((set, get, store) => ({
    ...makeBaseComposer(set, get, store),

    canCancel: false,
    isEditing: false,

    edit: () => {
      const value = onEdit();
      set({ isEditing: true, canCancel: true, value });
    },
    send: () => {
      const value = get().value;
      set({ isEditing: false, canCancel: false });
      onSend(value);
    },
    cancel: () => {
      set({ isEditing: false, canCancel: false });
    },
  }));
