import type { Unsubscribe } from "../../types/unsubscribe";
import type { ThreadRuntimeCore } from "../../runtime/interfaces/thread-runtime-core";
import {
  InertThreadRuntimeCore,
  createInertComposer,
} from "../inert/InertThreadRuntimeCore";

const EMPTY_THREAD_ERROR = new Error(
  "This is the empty thread, a placeholder for the main thread. You cannot perform any actions on this thread instance. This error is probably because you tried to call a thread method in your render function. Call the method inside a `useEffect` hook instead.",
);

class EmptyThreadRuntimeCore extends InertThreadRuntimeCore {
  protected get error() {
    return EMPTY_THREAD_ERROR;
  }

  messages = [] as never[];

  composer = createInertComposer(EMPTY_THREAD_ERROR, true);

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
    return Promise.reject(EMPTY_THREAD_ERROR);
  }
}

export const EMPTY_THREAD_CORE: ThreadRuntimeCore =
  new EmptyThreadRuntimeCore();
