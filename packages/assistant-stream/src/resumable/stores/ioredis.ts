import type {
  ChainableCommander,
  Cluster as IoRedisCluster,
  Redis as IoRedis,
} from "ioredis";
import {
  FINALIZE_IF_UNCHANGED_KEY_COUNT,
  FINALIZE_IF_UNCHANGED_SCRIPT,
  RedisResumableStreamStore,
  finalizeIfUnchangedArgs,
  type PipelineCommand,
  type RedisLikeClient,
  type RedisResumableStreamStoreOptions,
} from "./redis-impl";
import type { ResumableStreamStore } from "../types";

export type IoRedisLike = IoRedis | IoRedisCluster;

/**
 * Resumable stream store backed by [`ioredis`](https://www.npmjs.com/package/ioredis)
 * v5 or v6. Accepts a `Redis` or `Cluster` instance.
 */
export function createIoredisResumableStreamStore(
  client: IoRedisLike,
  options?: RedisResumableStreamStoreOptions,
): ResumableStreamStore {
  return new RedisResumableStreamStore(adapt(client), options);
}

function adapt(client: IoRedisLike): RedisLikeClient {
  return {
    async setNX(key, value, ttlSec) {
      const result = await client.set(key, value, "EX", ttlSec, "NX");
      return result === "OK";
    },
    async get(key) {
      return client.get(key);
    },
    async del(keys) {
      if (keys.length === 0) return;
      await client.del(...keys);
    },
    async xRange(key, start, end) {
      const entries = await client.xrangeBuffer(key, start, end);
      return entries.map(([idBuf, fieldArray]) => ({
        id: idBuf.toString("utf8"),
        fields: bufferFieldsToRecord(fieldArray),
      }));
    },
    async pipeline(commands) {
      if (commands.length === 0) return;
      const pipe = client.pipeline();
      for (const cmd of commands) {
        applyPipelineCommand(pipe, cmd);
      }
      const results = (await pipe.exec()) ?? [];
      for (const [err] of results) {
        if (err) throw err;
      }
    },
    async finalizeIfUnchanged(options) {
      const result = await client.eval(
        FINALIZE_IF_UNCHANGED_SCRIPT,
        FINALIZE_IF_UNCHANGED_KEY_COUNT,
        ...finalizeIfUnchangedArgs(options),
      );
      return result === 1;
    },
  };
}

function applyPipelineCommand(
  pipe: ChainableCommander,
  cmd: PipelineCommand,
): void {
  switch (cmd.type) {
    case "xAdd":
      pipe.xadd(cmd.key, "*", ...toFieldArgs(cmd.fields));
      return;
    case "expire":
      pipe.expire(cmd.key, cmd.ttlSec);
      return;
  }
}

function toFieldArgs(
  fields: Record<string, string | Uint8Array>,
): Array<string | Buffer> {
  const args: Array<string | Buffer> = [];
  for (const [k, v] of Object.entries(fields)) {
    args.push(k, typeof v === "string" ? v : toBuffer(v));
  }
  return args;
}

function toBuffer(bytes: Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) return bytes;
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function bufferFieldsToRecord(
  fields: Buffer[],
): Record<string, string | Uint8Array> {
  const out: Record<string, string | Uint8Array> = {};
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const key = fields[i]?.toString("utf8");
    const value = fields[i + 1];
    if (key !== undefined && value !== undefined) {
      out[key] = new Uint8Array(
        value.buffer,
        value.byteOffset,
        value.byteLength,
      );
    }
  }
  return out;
}
