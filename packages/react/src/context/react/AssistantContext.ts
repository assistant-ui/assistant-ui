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
    threadListItem: {
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
    thread: {
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
      query: {
        type: "index";
        index: number;
      };
    };
  };
};

export const AssistantStoreContext = createContext<AssistantApi | undefined>(
  undefined,
);

export const useAssistantApi = (): AssistantApi => {
  const context = useContext(AssistantStoreContext);
  if (!context)
    throw new Error("useAssistantApi must be used within AssistantProvider");

  return context;
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
