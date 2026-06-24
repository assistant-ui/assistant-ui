type DeepReadonly<T> = T extends ((...args: never[]) => unknown) ? T : T extends object ? {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
} : T;

type GorpOperation = {
  type: "set";
  path: string[];
  value: unknown;
} | {
  type: "append-text";
  path: string[];
  value: string;
};

type GorpMessage = {
  ops: GorpOperation[];
  ack?: number;
};

declare function appendText(value: string): string;

declare class GorpClient<T extends Record<string, unknown>, C> {
  private readonly mutator;
  private readonly _send;
  private committed;
  private optimistic;
  private _pending;
  private _nextSeq;
  private readonly changeListeners;
  private changes;
  private previousState;
  private optimisticDirty;
  constructor(config: GorpClient.Config<T, C>);
  get state(): DeepReadonly<T>;
  get firstPendingSeq(): number;
  apply(_param: GorpMessage): void;
  send(command: C): void;
  onChange(callback: () => void): () => void;
  resync(): void;
  isChangedAt(path: string[]): boolean;
  getChangedKeys(path: string[]): string[];
  private beginFrame;
  private replayMutator;
  private rebuildOptimistic;
}

declare namespace GorpClient {
  type Config<T extends Record<string, unknown>, C> = {
    initialState: T;
    mutator: (state: T, command: C, seq: number) => void;
    send: (command: C) => void;
  };
}

type RelaySerializedState<T> = {
  state: T;
};

declare class GorpRelay<T extends Record<string, unknown>, C> {
  private readonly gorp;
  private readonly _send;
  private readonly subscribers;
  constructor(config: GorpRelay.Config<T, C>);
  get state(): DeepReadonly<T>;
  receive(command: C): void;
  applyUpstream(msg: GorpMessage): void;
  subscribe(callback: (env: GorpMessage) => void): () => void;
  serialize(): RelaySerializedState<T>;
  restore(serialized: RelaySerializedState<T>): void;
}

declare namespace GorpRelay {
  type Config<T extends Record<string, unknown>, C> = {
    initialState: T;
    send: (command: C) => void;
  };
}

declare class GorpServer<T extends Record<string, unknown>, C> {
  private readonly gorp;
  private readonly mutator;
  private readonly flusher;
  private readonly _state;
  private _nextSeq;
  constructor(config: GorpServer.Config<T, C>);
  get state(): T;
  set state(value: T);
  receive(command: C): void;
  subscribe(callback: (env: GorpMessage) => void): () => void;
}

declare namespace GorpServer {
  type Config<T extends Record<string, unknown>, C> = {
    initialState: T;
    mutator: (state: T, command: C, seq: number) => void;
  };
}

interface GorpPubsub<C> {
  readonly state: unknown;
  receive(command: C): void;
  subscribe(callback: (env: GorpMessage) => void): () => void;
}

type GorpSession = {
  highWater: number;
  lastActivity: number;
};

type GorpSessionsState = {
  sessions: Record<string, {
    highWater: number;
  }>;
};

declare class GorpSessions<C> {
  private readonly inner;
  private readonly _sessions;
  private readonly clients;
  private outgoing;
  private lastSeenAck;
  private readonly unsubscribe;
  constructor(inner: GorpPubsub<C>);
  get sessions(): ReadonlyMap<string, GorpSession>;
  addClient(sessionId: string, fromSeq: number, send: (msg: GorpMessage) => void): GorpSessions.ClientHandle<C>;
  close(): void;
  serialize(): GorpSessionsState;
  restore(state: GorpSessionsState): void;
  private fanOut;
  private pruneSessions;
}

declare namespace GorpSessions {
  interface ClientHandle<C> {
    receive(command: C): void;
    remove(): void;
  }
}

declare namespace entry_root_exports {
  export { GorpClient, GorpMessage, GorpRelay, GorpServer, GorpSessions, GorpSessionsState, RelaySerializedState, appendText };
}

export { entry_root_exports as entry_root };
