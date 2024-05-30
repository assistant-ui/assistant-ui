import { type StoreApi, type UseBoundStore, create } from "zustand";

export type ComposerState = {
  isEditing: boolean;
  canCancel: boolean;

  send: () => void;
  cancel: () => void;

  value: string;
  setValue: (value: string) => void;
};

export type MessageComposerState = ComposerState & {
  edit: () => void;
};

export type MessageComposerStore = {
  useComposer: UseBoundStore<StoreApi<MessageComposerState>>;
};

export type ComposerStore = {
  useComposer: UseBoundStore<StoreApi<ComposerState>>;
};

export const makeMessageComposer = ({
  onEdit,
  onSend,
}: {
  onEdit: () => string;
  onSend: (value: string) => Promise<void>;
}) =>
  create<MessageComposerState>()((set, get) => ({
    canCancel: true,

    isEditing: false,

    value: "",
    setValue: (value) => {
      set({ value });
    },

    edit: () => {
      const value = onEdit();
      set({ isEditing: true, value });
    },
    send: () => {
      const value = get().value;
      set({ isEditing: false });
      return onSend(value);
    },
    cancel: () => {
      set({ isEditing: false });
    },
  }));

export const makeThreadComposer = ({
  onSend,
  onCancel,
}: {
  onSend: (value: string) => Promise<void>;
  onCancel: () => void;
}) =>
  create<ComposerState>()((set, get) => ({
    isEditing: true,

    canCancel: false,

    value: "",
    setValue: (value) => {
      set({ value });
    },

    send: () => {
      const value = get().value;
      set({ value: "", canCancel: true });
      onSend(value).then(() => {
        set({ canCancel: false });
      });
    },
    cancel: onCancel,
  }));
