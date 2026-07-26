import {
  createInMemoryResumableStreamStore,
  createResumableStreamContext,
} from "assistant-stream/resumable";
import { after } from "next/server";

const store = createInMemoryResumableStreamStore();
export const resumableContext = createResumableStreamContext({
  store,
  waitUntil: (promise) => after(promise),
});
