import { createClient, type RedisClientType } from "redis";

const KEY_PREFIX = "aui:stream:";
const STATUS_STREAMING = "streaming";
const STATUS_DONE = "done";

export interface ResumableStreamContext {
  resumableStream: (
    streamId: string,
    makeStream: () => ReadableStream<string>,
  ) => Promise<ReadableStream<string> | null>;
}

export interface ResumableStreamOptions {
  waitUntil: ((promise: Promise<unknown>) => void) | null;
  redisUrl?: string;
}

let globalRedis: RedisClientType | null = null;
let globalInitPromise: Promise<void> | null = null;

function getRedisClient(redisUrl?: string): {
  client: RedisClientType;
  initPromise: Promise<void>;
} {
  if (!globalRedis) {
    const url = redisUrl ?? process.env["REDIS_URL"];
    if (!url) {
      throw new Error("REDIS_URL environment variable is required");
    }
    globalRedis = createClient({ url });
    globalInitPromise = globalRedis.connect().then(() => {});
  }
  return { client: globalRedis, initPromise: globalInitPromise! };
}

export function unstable_createResumableStreamContext(
  options: ResumableStreamOptions,
): ResumableStreamContext {
  const waitUntil = options.waitUntil || ((p) => p);
  const { client: redis, initPromise } = getRedisClient(options.redisUrl);

  return {
    resumableStream: async (
      streamId: string,
      makeStream: () => ReadableStream<string>,
    ): Promise<ReadableStream<string> | null> => {
      await initPromise;

      const streamKey = `${KEY_PREFIX}data:${streamId}`;
      const statusKey = `${KEY_PREFIX}status:${streamId}`;

      const status = await redis.get(statusKey);

      if (status === STATUS_DONE) {
        return null;
      }

      if (status === STATUS_STREAMING) {
        return createConsumerStream(redis, streamKey, statusKey);
      }

      const acquired = await redis.setNX(statusKey, STATUS_STREAMING);

      if (!acquired) {
        return createConsumerStream(redis, streamKey, statusKey);
      }

      await redis.expire(statusKey, 24 * 60 * 60);

      return createProducerStream(
        redis,
        streamKey,
        statusKey,
        makeStream,
        waitUntil,
      );
    },
  };
}

async function createProducerStream(
  redis: RedisClientType,
  streamKey: string,
  statusKey: string,
  makeStream: () => ReadableStream<string>,
  waitUntil: (promise: Promise<unknown>) => void,
): Promise<ReadableStream<string>> {
  let streamDoneResolver: (() => void) | undefined;
  waitUntil(
    new Promise<void>((resolve) => {
      streamDoneResolver = resolve;
    }),
  );

  return new ReadableStream<string>({
    async start(controller) {
      const sourceStream = makeStream();
      const reader = sourceStream.getReader();

      const processStream = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              await redis.set(statusKey, STATUS_DONE, { EX: 24 * 60 * 60 });
              await redis.xAdd(streamKey, "*", { type: "done" });
              await redis.expire(streamKey, 24 * 60 * 60);

              try {
                controller.close();
              } catch {
                // noop
              }

              streamDoneResolver?.();
              return;
            }

            await redis.xAdd(streamKey, "*", { type: "chunk", data: value });

            try {
              controller.enqueue(value);
            } catch {
              // noop
            }
          }
        } catch (error) {
          await redis.set(statusKey, STATUS_DONE, { EX: 24 * 60 * 60 });
          await redis.xAdd(streamKey, "*", {
            type: "error",
            data: String(error),
          });
          await redis.expire(streamKey, 24 * 60 * 60);

          try {
            controller.error(error);
          } catch {
            // noop
          }

          streamDoneResolver?.();
        }
      };

      processStream();
    },
  });
}

async function createConsumerStream(
  redis: RedisClientType,
  streamKey: string,
  statusKey: string,
): Promise<ReadableStream<string>> {
  return new ReadableStream<string>({
    async start(controller) {
      let lastId = "0";

      const processStream = async () => {
        try {
          const existingEntries = await redis.xRange(streamKey, lastId, "+");

          for (const entry of existingEntries) {
            lastId = entry.id;
            const { type, data } = entry.message;

            if (type === "done") {
              controller.close();
              return;
            }

            if (type === "error") {
              controller.error(new Error(data));
              return;
            }

            if (type === "chunk" && data) {
              controller.enqueue(data);
            }
          }

          const status = await redis.get(statusKey);
          if (status === STATUS_DONE) {
            controller.close();
            return;
          }

          const pollForNewEntries = async () => {
            try {
              while (true) {
                const currentStatus = await redis.get(statusKey);
                if (currentStatus === STATUS_DONE) {
                  const remaining = await redis.xRange(
                    streamKey,
                    `(${lastId}`,
                    "+",
                  );
                  for (const entry of remaining) {
                    const { type, data } = entry.message;
                    if (type === "chunk" && data) {
                      controller.enqueue(data);
                    }
                  }
                  controller.close();
                  return;
                }

                const newEntries = await redis.xRead(
                  { key: streamKey, id: lastId },
                  { BLOCK: 5000, COUNT: 100 },
                );

                if (newEntries) {
                  for (const stream of newEntries) {
                    for (const entry of stream.messages) {
                      lastId = entry.id;
                      const { type, data } = entry.message;

                      if (type === "done") {
                        controller.close();
                        return;
                      }

                      if (type === "error") {
                        controller.error(new Error(data));
                        return;
                      }

                      if (type === "chunk" && data) {
                        controller.enqueue(data);
                      }
                    }
                  }
                }
              }
            } catch (error) {
              try {
                controller.error(error);
              } catch {
                // noop
              }
            }
          };

          await pollForNewEntries();
        } catch (error) {
          try {
            controller.error(error);
          } catch {
            // noop
          }
        }
      };

      processStream();
    },
  });
}
