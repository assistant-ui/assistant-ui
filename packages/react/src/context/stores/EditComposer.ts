import { create, UseBoundStore } from "zustand";
import { ReadonlyStore } from "../ReadonlyStore";

export type EditComposerState = Readonly<{
  type: "edit";

  /** @deprecated Use `text` instead. This will be removed in 0.6.0. */
  value: string;
  /** @deprecated Use `setText` instead. This will be removed in 0.6.0. */
  setValue: (value: string) => void;

  text: string;
  setText: (value: string) => void;

  canCancel: boolean;
  isEditing: boolean;
  isEmpty: boolean;

  edit: () => void;
  send: () => void;
  cancel: () => void;
}>;

export const makeEditComposerStore = ({
  onEdit,
  onSend,
}: {
  onEdit: () => string;
  onSend: (text: string) => void;
}): UseBoundStore<ReadonlyStore<EditComposerState>> =>
  create<EditComposerState>()((set, get) => ({
    type: "edit",

    get value() {
      return get().text;
    },
    setValue(value) {
      get().setText(value);
    },

    text: "",
    setText: (text) => {
      set({ text, isEmpty: text.trim().length === 0 });
    },

    canCancel: false,
    isEditing: false,
    isEmpty: true,

    edit: () => {
      const text = onEdit();
      set({
        isEditing: true,
        canCancel: true,
        isEmpty: text.trim().length === 0,
        text,
      });
    },
    send: () => {
      const text = get().text;
      set({ isEditing: false, canCancel: false });
      onSend(text);
    },
    cancel: () => {
      set({ isEditing: false, canCancel: false });
    },
  }));
