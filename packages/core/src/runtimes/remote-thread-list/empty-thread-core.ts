import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import {
  InertThreadRuntimeCore,
  createInertComposer,
} from "../inert/InertThreadRuntimeCore";

// Created where it is thrown, so the stack shows the call that came too early.
const createEmptyThreadError = () =>
  new Error(
    "This is the empty thread, the placeholder assistant-ui shows until a thread's runtime has mounted: while the thread list loads, and while a thread you opened is still mounting. It cannot run actions, so this call came too early, often from the first render or an effect that runs on mount. Call the method from an event handler, or wait until `useAuiState((s) => s.thread.isLoading)` is false.",
  );

class EmptyThreadRuntimeCore extends InertThreadRuntimeCore {
  protected get error() {
    return createEmptyThreadError();
  }

  messages = [] as never[];

  composer = createInertComposer(createEmptyThreadError, true);

  isLoading = true;

  getMessageById() {
    return undefined;
  }

  getBranches() {
    return [];
  }

  export() {
    return { messages: [] };
  }

  override subscribe(): Unsubscribe {
    return () => {};
  }

  override waitForUpdate(): Promise<void> {
    return Promise.reject(createEmptyThreadError());
  }
}

export const EMPTY_THREAD_CORE: ThreadRuntimeCore =
  new EmptyThreadRuntimeCore();
