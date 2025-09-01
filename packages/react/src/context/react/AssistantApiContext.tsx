"use client";

import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useDebugValue,
  useMemo,
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
import { ThreadViewportProvider } from "../providers/ThreadViewportProvider";

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

export type AssistantMeta = {
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

export type AssistantApi = Store<AssistantState, AssistantActions> & {
  meta: AssistantMeta;
};

const EMPTY_STATE_ACTIONS: AssistantState & AssistantActions = {
  get threads(): never {
    throw new Error("Threads is only available inside <AssistantProvider />");
  },
  get toolUIs(): never {
    throw new Error("ToolUIs is only available inside <AssistantProvider />");
  },
  get threadListItem(): never {
    throw new Error(
      "ThreadListItem is only available inside <AssistantProvider />",
    );
  },
  get thread(): never {
    throw new Error("Thread is only available inside <AssistantProvider />");
  },
  get composer(): never {
    throw new Error("Composer is only available inside <AssistantProvider />");
  },
  get message(): never {
    throw new Error(
      "Message is only available inside <ThreadPrimitive.Messages />",
    );
  },
  get part(): never {
    throw new Error("Part is only available inside <MessagePrimitive.Parts />");
  },
  get attachment(): never {
    throw new Error(
      "Attachment is only available inside <MessagePrimitive.Attachments /> or <ComposerPrimitive.Attachments />",
    );
  },
  registerModelContextProvider: () => {
    throw new Error(
      "Registering model context providers is only available inside <AssistantProvider />",
    );
  },
  __internal_getRuntime: () => {
    return null;
  },
};

export const AssistantApiContext = createContext<AssistantApi>({
  getState: () => EMPTY_STATE_ACTIONS,
  getInitialState: () => EMPTY_STATE_ACTIONS,
  subscribe: () => () => {},
  flushSync: () => {},
  actions: EMPTY_STATE_ACTIONS,
  meta: {},
});

export const useAssistantApi = (): AssistantApi => {
  return useContext(AssistantApiContext);
};

export const useAssistantState = <T,>(
  selector: (state: AssistantState) => T,
): T => {
  const store = useAssistantApi();
  const slice = useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getInitialState()),
  );
  useDebugValue(slice);

  if (slice instanceof ProxiedAssistantState)
    throw new Error(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );

  return slice;
};

class ProxiedAssistantState implements AssistantState {
  constructor(
    public readonly getState: () => AssistantState,
    getState2: () => Partial<AssistantState>,
    store2keys: (keyof AssistantState)[],
  ) {
    store2keys.forEach((key) => {
      Object.defineProperty(this, key, {
        get() {
          return getState2()[key];
        },
      });
    });
  }

  get threads() {
    return this.getState().threads;
  }

  get toolUIs() {
    return this.getState().toolUIs;
  }

  get threadListItem() {
    return this.getState().threadListItem;
  }

  get thread() {
    return this.getState().thread;
  }

  get composer() {
    return this.getState().composer;
  }

  get message() {
    return this.getState().message;
  }

  get part() {
    return this.getState().part;
  }

  get attachment() {
    return this.getState().attachment;
  }
}

type PartialAssistantApi = Store<
  Partial<AssistantState>,
  Partial<AssistantActions>
> & { meta: AssistantMeta };

const extendApi = (
  api: AssistantApi,
  api2: PartialAssistantApi,
): AssistantApi => {
  const initialState2 = api2.getInitialState();
  const initialState = {
    ...api.getInitialState(),
    ...initialState2,
  };

  const store2keys = Object.keys(initialState2) as (keyof AssistantState)[];
  const state = new ProxiedAssistantState(
    api.getState,
    api2.getState,
    store2keys,
  );

  return {
    getState: () => state,
    getInitialState: () => initialState,
    subscribe: (listener) => {
      const unsubscribe = api.subscribe(listener);
      const unsubscribe2 = api2.subscribe(listener);
      return () => {
        unsubscribe();
        unsubscribe2();
      };
    },
    flushSync: () => {
      api.flushSync();
      api2.flushSync();
    },
    actions: {
      ...api.actions,
      ...api2.actions,
    },
    meta: {
      ...api.meta,
      ...api2.meta,
    },
  };
};

export const ExtendedAssistantApiProvider: FC<
  PropsWithChildren<{ api: PartialAssistantApi }>
> = ({ api: api2, children }) => {
  const api = useAssistantApi();
  const extendedApi = useMemo(() => extendApi(api, api2), [api, api2]);

  return (
    <AssistantApiContext value={extendedApi}>{children}</AssistantApiContext>
  );
};

export const AssistantApiProvider: FC<
  PropsWithChildren<{ client: AssistantApi }>
> = ({ children, client }) => {
  return (
    <AssistantApiContext value={client}>
      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadViewportProvider>{children}</ThreadViewportProvider>
    </AssistantApiContext>
  );
};
