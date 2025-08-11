import {
  resource,
  ResourceElement,
  tapInlineResource,
  tapMemo,
  tapRef,
  tapResource,
  tapState,
} from "@assistant-ui/tap";
import { BaseThread } from "./BaseThread";
import { ConnectionMetadata, UIStateConverter } from "./UIStateConverter";
import { UICommand } from "./types/thread-types";
import { createAssistantStream } from "../stream/createAssistantStream";
import { ReadonlyJSONValue } from "../utils/json-types";

type AssistantStreamThreadBackendProps<TState extends ReadonlyJSONValue> = {
  initialState: TState;
  onSend: (state: TState, commands: readonly UICommand[]) => void;
};

export const AssistantStreamThreadBackend = resource(
  <TState extends ReadonlyJSONValue>({
    initialState,
    onSend,
  }: AssistantStreamThreadBackendProps<TState>): ThreadBackend<TState> => {
    const [, rerender] = tapState({});
    const stateRef = tapRef<TState>(initialState);
    const busyPromiseRef = tapRef<Promise<void> | undefined>();

    return {
      state: stateRef.current,
      metadata: { isSending: busyPromiseRef.current !== undefined },
      dispatch: async (commands) => {
        while (busyPromiseRef.current) {
          await busyPromiseRef.current;
        }

        busyPromiseRef.current = new Promise(async (resolve) => {
          try {
            const stream = createAssistantStream({
              defaultValue: stateRef.current,
              execute: () => onSend(stateRef.current, commands),
            });

            for await (const chunk of stream) {
              stateRef.current = chunk.snapshot;
              rerender({});
            }
          } finally {
            busyPromiseRef.current = undefined;
            rerender({});
            resolve();
          }
        });
        rerender({});
      },
    };
  }
);

type ThreadBackend<TState> = {
  state: TState;
  metadata: ConnectionMetadata;
  dispatch: (commands: readonly UICommand[]) => void;
};

export type ThreadConfig<TState> = {
  backend: ResourceElement<ThreadBackend<TState>>;
  converter: UIStateConverter<TState>;
};

export const Thread = resource(
  <TState>({ backend: backendEl, converter }: ThreadConfig<TState>) => {
    const { state: backendState, metadata, dispatch } = tapResource(backendEl);

    const converterStore = tapMemo(() => converter.getStore(), [converter]);

    const state = tapMemo(
      () => converterStore.convert({ state: backendState, metadata }),
      [converterStore, backendState, metadata]
    );

    return tapInlineResource(BaseThread({ state, onDispatch: dispatch }));
  }
);
