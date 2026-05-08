import { ResumableStreamError, validateStreamId } from "../errors";
import type {
  ResumableStreamAcquireOptions,
  ResumableStreamEntry,
  ResumableStreamRole,
  ResumableStreamStatus,
  ResumableStreamStore,
} from "../types";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 100;
const DEFAULT_KEY_PREFIX = "aui:resumable";

const FIELD_CHUNK = "c";
const FIELD_FIN = "fin";
const FIELD_ERROR = "error";

const FIN_DONE = "done";
const FIN_ERROR = "error";

const STREAM_START_ID = "0-0";

export type PipelineCommand =
  | {
      readonly type: "xAdd";
      readonly key: string;
      readonly fields: Record<string, string | Uint8Array>;
    }
  | { readonly type: "expire"; readonly key: string; readonly ttlSec: number }
  | {
      readonly type: "set";
      readonly key: string;
      readonly value: string;
      readonly ttlSec: number;
    };

/**
 * Structural Redis-client interface. The bundled `redis` and `ioredis`
 * adapters wrap their respective clients to satisfy it; custom or proxied
 * clients can implement it directly.
 */
export interface RedisLikeClient {
  setNX(key: string, value: string, ttlSec: number): Promise<boolean>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  get(key: string): Promise<string | null>;
  expire(key: string, ttlSec: number): Promise<void>;
  exists(key: string): Promise<boolean>;
  del(keys: string[]): Promise<void>;
  xAdd(
    key: string,
    fields: Record<string, string | Uint8Array>,
  ): Promise<string>;
  xRange(
    key: string,
    start: string,
    end: string,
  ): Promise<
    Array<{ id: string; fields: Record<string, string | Uint8Array> }>
  >;
  /** Executes the commands as a single pipeline batch (one round trip). */
  pipeline(commands: readonly PipelineCommand[]): Promise<void>;
}

export type RedisResumableStreamStoreOptions = {
  readonly keyPrefix?: string;
  readonly defaultTtlMs?: number;
  /** Defaults to 100ms. Lower values reduce read latency, raise traffic. */
  readonly pollIntervalMs?: number;
  readonly maxChunkBytes?: number;
};

export class RedisResumableStreamStore implements ResumableStreamStore {
  private readonly client: RedisLikeClient;
  private readonly keyPrefix: string;
  private readonly defaultTtlMs: number;
  private readonly pollIntervalMs: number;
  private readonly maxChunkBytes: number | undefined;

  constructor(
    client: RedisLikeClient,
    options: RedisResumableStreamStoreOptions = {},
  ) {
    this.client = client;
    this.keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.maxChunkBytes = options.maxChunkBytes;
  }

  async acquire(
    streamId: string,
    options?: ResumableStreamAcquireOptions,
  ): Promise<ResumableStreamRole> {
    validateStreamId(streamId);
    const ttlSec = msToSec(options?.ttlMs ?? this.defaultTtlMs);
    const meta = JSON.stringify({ status: "streaming", ttlSec });
    const acquired = await this.client.setNX(
      this.metaKey(streamId),
      meta,
      ttlSec,
    );
    if (acquired) {
      // a prior producer's data key may outlive its expired meta key.
      await this.client.del([this.dataKey(streamId)]);
      return "producer";
    }
    return "consumer";
  }

  async append(streamId: string, chunk: Uint8Array): Promise<void> {
    validateStreamId(streamId);
    if (
      this.maxChunkBytes !== undefined &&
      chunk.byteLength > this.maxChunkBytes
    ) {
      throw new Error(
        `Chunk exceeds maxChunkBytes (${chunk.byteLength} > ${this.maxChunkBytes})`,
      );
    }
    const dataKey = this.dataKey(streamId);
    const metaKey = this.metaKey(streamId);
    const meta = await this.readMeta(streamId);
    if (!meta) {
      throw new Error(`Stream not found: ${streamId}`);
    }
    if (meta.status !== "streaming") {
      throw new ResumableStreamError(
        "finalized",
        `Stream already finalized: ${streamId}`,
      );
    }
    const ttlSec = meta.ttlSec ?? msToSec(this.defaultTtlMs);
    await this.client.pipeline([
      { type: "xAdd", key: dataKey, fields: { [FIELD_CHUNK]: chunk } },
      { type: "expire", key: dataKey, ttlSec },
      { type: "expire", key: metaKey, ttlSec },
    ]);
  }

  async finalize(
    streamId: string,
    status: "done" | "error",
    error?: string,
  ): Promise<void> {
    validateStreamId(streamId);
    const dataKey = this.dataKey(streamId);
    const metaKey = this.metaKey(streamId);
    const existing = await this.readMeta(streamId);
    if (!existing) {
      throw new Error(`Stream not found: ${streamId}`);
    }
    // a second finalize must not append a duplicate FIN entry.
    if (existing.status !== "streaming") return;
    const ttlSec = existing.ttlSec ?? msToSec(this.defaultTtlMs);
    const meta = JSON.stringify(
      status === "error"
        ? { status: "error", error: error ?? "Stream errored", ttlSec }
        : { status: "done", ttlSec },
    );
    const fields: Record<string, string> = {
      [FIELD_FIN]: status === "error" ? FIN_ERROR : FIN_DONE,
    };
    if (status === "error") {
      fields[FIELD_ERROR] = error ?? "Stream errored";
    }
    await this.client.pipeline([
      { type: "set", key: metaKey, value: meta, ttlSec },
      { type: "xAdd", key: dataKey, fields },
      { type: "expire", key: dataKey, ttlSec },
    ]);
  }

  async *read(
    streamId: string,
    cursor: string,
    signal: AbortSignal,
  ): AsyncIterable<ResumableStreamEntry> {
    validateStreamId(streamId);
    const dataKey = this.dataKey(streamId);
    const metaKey = this.metaKey(streamId);
    const initialMeta = await this.client.get(metaKey);
    if (initialMeta === null) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    let lastId = cursor === "" ? STREAM_START_ID : cursor;

    while (true) {
      if (signal.aborted) return;

      const start = lastId === STREAM_START_ID ? "-" : `(${lastId}`;
      const entries = await this.client.xRange(dataKey, start, "+");

      for (const entry of entries) {
        if (signal.aborted) return;
        lastId = entry.id;

        const fin = readString(entry.fields[FIELD_FIN]);
        if (fin === FIN_DONE) return;
        if (fin === FIN_ERROR) {
          throw new Error(
            readString(entry.fields[FIELD_ERROR]) ?? "Stream errored",
          );
        }

        const raw = entry.fields[FIELD_CHUNK];
        if (raw === undefined) continue;
        yield { cursor: entry.id, chunk: toBytes(raw) };
      }

      if (entries.length > 0) continue;

      const stillExists = await this.client.exists(metaKey);
      if (!stillExists) return;

      await sleep(this.pollIntervalMs, signal);
    }
  }

  async status(streamId: string): Promise<ResumableStreamStatus> {
    validateStreamId(streamId);
    const meta = await this.client.get(this.metaKey(streamId));
    if (meta === null) return "missing";
    const parsed = parseMeta(meta);
    if (parsed?.status === "streaming") return "streaming";
    if (parsed?.status === "done") return "done";
    if (parsed?.status === "error") return "error";
    return "missing";
  }

  async delete(streamId: string): Promise<void> {
    validateStreamId(streamId);
    await this.client.del([this.metaKey(streamId), this.dataKey(streamId)]);
  }

  private async readMeta(streamId: string): Promise<ParsedMeta | undefined> {
    const raw = await this.client.get(this.metaKey(streamId));
    if (raw === null) return undefined;
    return parseMeta(raw);
  }

  // {streamId} is a Redis Cluster hash tag so both keys live on the same
  // shard; multi-key DEL and same-stream pipelines stay single-slot.
  private metaKey(streamId: string): string {
    return `${this.keyPrefix}:{${streamId}}:meta`;
  }

  private dataKey(streamId: string): string {
    return `${this.keyPrefix}:{${streamId}}:data`;
  }
}

type ParsedMeta = {
  status?: string;
  error?: string;
  ttlSec?: number;
};

function parseMeta(value: string): ParsedMeta | undefined {
  try {
    const parsed = JSON.parse(value) as ParsedMeta;
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function msToSec(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function readString(
  value: string | Uint8Array | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return new TextDecoder().decode(value);
}

function toBytes(value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) return value;
  return new TextEncoder().encode(value);
}
