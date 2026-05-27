import {
  createInMemoryResumableStreamStore,
  createResumableStreamContext,
  type ResumableStreamContext,
  type ResumableStreamStore,
} from "assistant-stream/resumable";

const GLOBAL_KEY = Symbol.for("assistant-ui.example.resumable-context");

type GlobalSlot = typeof globalThis & {
  [GLOBAL_KEY]?: Promise<ResumableStreamContext>;
};

const slot = globalThis as GlobalSlot;

export function getResumableStreamContext(): Promise<ResumableStreamContext> {
  if (slot[GLOBAL_KEY]) return slot[GLOBAL_KEY];
  const promise = (async () => {
    const store = await createStore();
    return createResumableStreamContext({ store });
  })();
  // clear the cache on rejection so the next request retries connecting.
  promise.catch(() => {
    if (slot[GLOBAL_KEY] === promise) {
      delete slot[GLOBAL_KEY];
    }
  });
  slot[GLOBAL_KEY] = promise;
  return promise;
}

async function createStore(): Promise<ResumableStreamStore> {
  const url = process.env["REDIS_URL"];
  if (!url) {
    return createInMemoryResumableStreamStore();
  }

  const { createClient } = await import("redis");
  const { createRedisResumableStreamStore } =
    await import("assistant-stream/resumable/redis");

  const client = createClient({ url });
  client.on("error", (err) => {
    console.error("[resumable-stream] redis client error:", err);
  });
  await client.connect();
  return createRedisResumableStreamStore(client);
}
