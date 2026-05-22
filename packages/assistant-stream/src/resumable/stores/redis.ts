import {
  RedisResumableStreamStore,
  type PipelineCommand,
  type RedisLikeClient,
  type RedisResumableStreamStoreOptions,
} from "./redis-impl";
import type { ResumableStreamStore } from "../types";

const RESP_BLOB_STRING = 36;

type NodeRedisFields = Record<string, string | Buffer>;

interface NodeRedisMultiCommand {
  xAdd(key: string, id: string, fields: NodeRedisFields): NodeRedisMultiCommand;
  expire(key: string, seconds: number): NodeRedisMultiCommand;
  set(
    key: string,
    value: string,
    options: { EX: number },
  ): NodeRedisMultiCommand;
  execAsPipeline(): Promise<unknown>;
  exec(): Promise<unknown>;
}

/** Structural subset of node-redis v5 used by the adapter. */
export interface NodeRedisLike {
  set(
    key: string,
    value: string,
    options: { NX: true; EX: number },
  ): Promise<string | null>;
  set(
    key: string,
    value: string,
    options: { EX: number },
  ): Promise<string | null>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<unknown>;
  exists(key: string): Promise<number>;
  del(keys: string | string[]): Promise<unknown>;
  xAdd(key: string, id: string, fields: NodeRedisFields): Promise<string>;
  sendCommand<T = unknown>(
    args: ReadonlyArray<string | Buffer>,
    options?: { typeMapping?: Record<number, unknown> },
  ): Promise<T>;
  multi(): NodeRedisMultiCommand;
}

/**
 * Resumable stream store backed by [`redis`](https://www.npmjs.com/package/redis)
 * v5. Expects a connected client; cluster routing relies on the shared
 * `{streamId}` hash tag baked into the key scheme.
 */
export function createRedisResumableStreamStore(
  client: NodeRedisLike,
  options?: RedisResumableStreamStoreOptions,
): ResumableStreamStore {
  return new RedisResumableStreamStore(adapt(client), options);
}

function adapt(client: NodeRedisLike): RedisLikeClient {
  return {
    async setNX(key, value, ttlSec) {
      const result = await client.set(key, value, { NX: true, EX: ttlSec });
      return result === "OK";
    },
    async set(key, value, ttlSec) {
      await client.set(key, value, { EX: ttlSec });
    },
    async get(key) {
      return client.get(key);
    },
    async expire(key, ttlSec) {
      await client.expire(key, ttlSec);
    },
    async exists(key) {
      const result = await client.exists(key);
      return result > 0;
    },
    async del(keys) {
      if (keys.length === 0) return;
      await client.del(keys.length === 1 ? keys[0]! : keys);
    },
    async xAdd(key, fields) {
      return client.xAdd(key, "*", toNodeFields(fields));
    },
    async xRange(key, start, end) {
      const reply = await client.sendCommand<unknown>(
        ["XRANGE", key, start, end],
        { typeMapping: { [RESP_BLOB_STRING]: Buffer } },
      );
      return parseXRangeReply(reply);
    },
    async pipeline(commands) {
      if (commands.length === 0) return;
      let chain = client.multi();
      for (const cmd of commands) {
        chain = applyPipelineCommand(chain, cmd);
      }
      await chain.execAsPipeline();
    },
  };
}

function applyPipelineCommand(
  chain: NodeRedisMultiCommand,
  cmd: PipelineCommand,
): NodeRedisMultiCommand {
  switch (cmd.type) {
    case "xAdd":
      return chain.xAdd(cmd.key, "*", toNodeFields(cmd.fields));
    case "expire":
      return chain.expire(cmd.key, cmd.ttlSec);
    case "set":
      return chain.set(cmd.key, cmd.value, { EX: cmd.ttlSec });
  }
}

function toNodeFields(
  fields: Record<string, string | Uint8Array>,
): NodeRedisFields {
  const out: NodeRedisFields = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = typeof v === "string" ? v : toBuffer(v);
  }
  return out;
}

function toBuffer(bytes: Uint8Array): Buffer {
  if (Buffer.isBuffer(bytes)) return bytes;
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function parseXRangeReply(
  reply: unknown,
): Array<{ id: string; fields: Record<string, string | Uint8Array> }> {
  if (!Array.isArray(reply)) return [];
  const out: Array<{
    id: string;
    fields: Record<string, string | Uint8Array>;
  }> = [];
  for (const entry of reply) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [rawId, rawFields] = entry as [unknown, unknown];
    const id = bufferOrStringToString(rawId);
    if (id === undefined || !Array.isArray(rawFields)) continue;
    const fields: Record<string, string | Uint8Array> = {};
    for (let i = 0; i + 1 < rawFields.length; i += 2) {
      const fieldKey = bufferOrStringToString(rawFields[i]);
      const fieldValue = rawFields[i + 1];
      if (fieldKey === undefined || fieldValue === undefined) continue;
      fields[fieldKey] = bufferOrStringToBytes(fieldValue);
    }
    out.push({ id, fields });
  }
  return out;
}

function bufferOrStringToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return undefined;
}

function bufferOrStringToBytes(value: unknown): string | Uint8Array {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  return "";
}
