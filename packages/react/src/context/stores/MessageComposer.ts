import { type StoreApi, type UseBoundStore, create } from "zustand";
import { type BaseComposerState, makeBaseComposer } from "./BaseComposer";

export type EditComposerState = BaseComposerState &
  Readonly<{
    isEditing: boolean;

    edit: () => void;
    send: () => void;
    cancel: () => boolean;
  }>;

export const makeEditComposerStore = ({
  onEdit,
  onSend,
}: {
  onEdit: () => string;
  onSend: (value: string) => void;
}): UseBoundStore<StoreApi<EditComposerState>> =>
  create<EditComposerState>()((set, get, store) => ({
    ...makeBaseComposer(set, get, store),

    isEditing: false,

    edit: () => {
      const value = onEdit();
      set({ isEditing: true, value });
    },
    send: () => {
      const value = get().value;
      set({ isEditing: false });
      onSend(value);
    },
    cancel: () => {
      if (!get().isEditing) return false;
      set({ isEditing: false });
      return true;
    },
  }));
