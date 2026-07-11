import {
  createInMemoryResumableStreamStore,
  createResumableStreamContext,
} from "assistant-stream/resumable";

const store = createInMemoryResumableStreamStore();
export const resumableContext = createResumableStreamContext({ store });
