import {
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
  create,
} from "zustand";
import type { ThreadState } from "./AssistantTypes";

// base

type BaseComposerState = {
  value: string;
  setValue: (value: string) => void;
};

const makeBaseComposer: StateCreator<
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

// message

export type MessageComposerState = BaseComposerState & {
  isEditing: boolean;

  edit: () => void;
  send: () => void;
  cancel: () => boolean;
};

export const makeMessageComposerStore = ({
  onEdit,
  onSend,
}: {
  onEdit: () => string;
  onSend: (value: string) => void;
}): UseBoundStore<StoreApi<MessageComposerState>> =>
  create<MessageComposerState>()((set, get, store) => ({
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

// thread

export type ThreadComposerState = BaseComposerState & {
  isEditing: true;

  send: () => void;
  cancel: () => boolean;
};

export const makeThreadComposerStore = (
  useThread: StoreApi<ThreadState>,
): UseBoundStore<StoreApi<ThreadComposerState>> =>
  create<ThreadComposerState>()((set, get, store) => {
    return {
      ...makeBaseComposer(set, get, store),

      isEditing: true,

      send: () => {
        const { value } = get();
        set({ value: "" });

        useThread.getState().append({
          parentId: useThread.getState().messages.at(-1)?.id ?? null,
          content: [{ type: "text", text: value }],
        });
      },
      cancel: () => {
        const thread = useThread.getState();
        if (!thread.isRunning) return false;

        useThread.getState().cancelRun();
        return true;
      },
    };
  });
