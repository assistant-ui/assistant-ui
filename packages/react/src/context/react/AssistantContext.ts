"use client";

import {
  createContext,
  useContext,
  useDebugValue,
  useSyncExternalStore,
} from "react";

import {
  AssistantClientActions,
  AssistantClientState,
} from "../../client/AssistantClient";
import {
  MessageClientActions,
  MessageClientState,
} from "../../client/MessageClient";
import { Store } from "../../utils/tap-store";
import {
  ThreadListItemClientActions,
  ThreadListItemClientState,
} from "../../client/ThreadListItemClient";
import {
  MessagePartClientActions,
  MessagePartClientState,
} from "../../client/MessagePartClient";
import {
  ThreadClientActions,
  ThreadClientState,
} from "../../client/ThreadClient";
import {
  ComposerClientActions,
  ComposerClientState,
} from "../../client/ComposerClient";
import {
  AttachmentClientActions,
  AttachmentClientState,
} from "../../client/AttachmentClient";

export type AssistantState = AssistantClientState & {
  threadListItem: ThreadListItemClientState;
  thread: ThreadClientState;
  composer: ComposerClientState;
  message: MessageClientState;
  part: MessagePartClientState;
  attachment: AttachmentClientState;
};

export type AssistantActions = AssistantClientActions & {
  threadListItem: ThreadListItemClientActions;
  thread: ThreadClientActions;
  composer: ComposerClientActions;
  message: MessageClientActions;
  part: MessagePartClientActions;
  attachment: AttachmentClientActions;
};

export type AssistantApi = Store<AssistantState, AssistantActions> & {
  meta: {
    threads?: {
      source: "root";
      query: Record<string, never>;
    };
    toolUIs?: {
      source: "root";
      query: Record<string, never>;
    };
    threadListItem?: {
      source: "threads";
      query:
        | {
            type: "index";
            index: number;
            archived: boolean;
          }
        | {
            type: "main";
          }
        | {
            type: "id";
            id: string;
          };
    };
    thread?: {
      source: "threads";
      query: { type: "main" };
    };
    attachment?: {
      source: "message" | "composer";
      query: {
        type: "index";
        index: number;
      };
    };
    composer?: {
      source: "message" | "thread";
      query: Record<string, never>;
    };
    part?:
      | {
          source: "message";
          query: {
            type: "index";
            index: number;
          };
        }
      | {
          source: "root";
          query: Record<string, never>;
        };
    message?: {
      source: "thread";
      query: {
        type: "index";
        index: number;
      };
    };
  };
};

const EMPTY_PROXY = new Proxy({} as any, {
  get: () => {
    throw new Error("Not implemented");
  },
});

export const AssistantStoreContext = createContext<AssistantApi>({
  getState: () => EMPTY_PROXY,
  getInitialState: () => EMPTY_PROXY,
  subscribe: () => () => {},
  actions: EMPTY_PROXY,
  meta: {},
});

export const useAssistantApi = (): AssistantApi => {
  return useContext(AssistantStoreContext);
};

export const useAssistantState = <T>(
  selector: (state: AssistantState) => T,
): T => {
  const store = useAssistantApi();
  const slice = useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getInitialState()),
  );
  useDebugValue(slice);

  return slice;
};
