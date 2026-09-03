import { DEFAULT_TTL_MS } from "../constants";
import { ResumableStreamError, validateStreamId } from "../errors";
import { generateId } from "../../core/utils/generateId";
import type {
  ResumableStreamAcquireOptions,
  ResumableStreamEntry,
  ResumableStreamRole,
  ResumableStreamStatus,
  ResumableStreamStore,
} from "../types";

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
  | { readonly type: "expire"; readonly key: string; readonly ttlSec: number };

export type RedisFinalizeOptions = {
  readonly metaKey: string;
  readonly expectedMeta: string;
  readonly nextMeta: string;
  readonly dataKey: string;
  readonly fields: Record<string, string>;
  readonly ttlSec: number;
};

// `XADD *` is non-deterministic; Redis 5.x and 6.x configured with
// `lua-replicate-commands no` reject it unless effects replication is requested.
export const FINALIZE_IF_UNCHANGED_SCRIPT = `
redis.replicate_commands()
if redis.call("GET", KEYS[1]) ~= ARGV[1] then
  return 0
end
local xadd = { "XADD", KEYS[2], "*" }
for i = 4, #ARGV do
  table.insert(xadd, ARGV[i])
end
redis.call(unpack(xadd))
redis.call("EXPIRE", KEYS[2], ARGV[3])
redis.call("SET", KEYS[1], ARGV[2], "EX", ARGV[3])
return 1
`;

export const FINALIZE_IF_UNCHANGED_KEY_COUNT = 2;

export function finalizeIfUnchangedArgs(
  options: RedisFinalizeOptions,
): string[] {
  return [
    options.metaKey,
    options.dataKey,
    options.expectedMeta,
    options.nextMeta,
    String(options.ttlSec),
    ...Object.entries(options.fields).flat(),
  ];
}

/**
 * Structural Redis-client interface. The bundled `redis` and `ioredis`
 * adapters wrap their respective clients to satisfy it.
 */
export interface RedisLikeClient {
  setNX(key: string, value: string, ttlSec: number): Promise<boolean>;
  get(key: string): Promise<string | null>;
  del(keys: string[]): Promise<void>;
  xRange(
    key: string,
    start: string,
    end: string,
  ): Promise<
    Array<{ id: string; fields: Record<string, string | Uint8Array> }>
  >;
  /** Executes the commands as a single pipeline batch (one round trip). */
  pipeline(commands: readonly PipelineCommand[]): Promise<void>;
  /**
   * Atomically finalizes a stream only while its metadata is unchanged, so a
   * producer superseded by a newer acquisition cannot finalize the replacement.
   */
  finalizeIfUnchanged(options: RedisFinalizeOptions): Promise<boolean>;
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

  // Fencing state for producers acquired through this instance: an append or
  // finalize whose current metadata carries a different generation lost the
  // stream to a newer acquisition and must not write into it.
  private readonly acquiredGenerations = new Map<string, string>();

  async acquire(
    streamId: string,
    options?: ResumableStreamAcquireOptions,
  ): Promise<ResumableStreamRole> {
    validateStreamId(streamId);
    const ttlSec = msToSec(options?.ttlMs ?? this.defaultTtlMs);
    const generation = generateId();
    const meta = JSON.stringify({
      status: "streaming",
      ttlSec,
      generation,
    });
    const acquired = await this.client.setNX(
      this.metaKey(streamId),
      meta,
      ttlSec,
    );
    if (!acquired) return "consumer";
    this.acquiredGenerations.set(streamId, generation);
    return "producer";
  }

  private isSupersededGeneration(streamId: string, meta: ParsedMeta): boolean {
    const acquired = this.acquiredGenerations.get(streamId);
    return acquired !== undefined && meta.generation !== acquired;
  }

  private assertOwnedGeneration(streamId: string, meta: ParsedMeta): void {
    if (this.isSupersededGeneration(streamId, meta)) {
      throw new ResumableStreamError(
        "missing",
        `Stream superseded by a new acquisition: ${streamId}`,
      );
    }
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
    const metaKey = this.metaKey(streamId);
    const meta = await this.readMeta(streamId);
    if (!meta) {
      throw new Error(`Stream not found: ${streamId}`);
    }
    this.assertOwnedGeneration(streamId, meta);
    if (meta.status !== "streaming") {
      throw new ResumableStreamError(
        "finalized",
        `Stream already finalized: ${streamId}`,
      );
    }
    const ttlSec = meta.ttlSec ?? msToSec(this.defaultTtlMs);
    const dataKey = this.dataKey(streamId, meta.generation);
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
    const metaKey = this.metaKey(streamId);
    const existingRaw = await this.client.get(metaKey);
    if (existingRaw === null) {
      throw new Error(`Stream not found: ${streamId}`);
    }
    const existing = parseMeta(existingRaw);
    if (!existing) {
      throw new Error(`Stream not found: ${streamId}`);
    }
    // a second finalize must not append a duplicate FIN entry, and a producer
    // superseded by a newer acquisition must not finalize the new stream.
    if (existing.status !== "streaming") return;
    if (this.isSupersededGeneration(streamId, existing)) return;
    const ttlSec = existing.ttlSec ?? msToSec(this.defaultTtlMs);
    const meta = JSON.stringify({
      status,
      ...(status === "error" && { error: error ?? "Stream errored" }),
      ttlSec,
      ...(existing.generation !== undefined && {
        generation: existing.generation,
      }),
    });
    const fields: Record<string, string> = {
      [FIELD_FIN]: status === "error" ? FIN_ERROR : FIN_DONE,
    };
    if (status === "error") {
      fields[FIELD_ERROR] = error ?? "Stream errored";
    }
    const dataKey = this.dataKey(streamId, existing.generation);
    const finalized = await this.client.finalizeIfUnchanged({
      metaKey,
      expectedMeta: existingRaw,
      nextMeta: meta,
      dataKey,
      fields,
      ttlSec,
    });
    // Keeping the fencing token when the compare-and-finalize loses is what
    // makes a later append from this superseded producer throw instead of
    // writing into the replacement generation.
    if (!finalized) return;
    this.acquiredGenerations.delete(streamId);
  }

  async *read(
    streamId: string,
    cursor: string,
    signal: AbortSignal,
  ): AsyncIterable<ResumableStreamEntry> {
    validateStreamId(streamId);
    const metaKey = this.metaKey(streamId);
    const initialMeta = await this.client.get(metaKey);
    if (initialMeta === null) {
      throw new Error(`Stream not found: ${streamId}`);
    }
    const generation = parseMeta(initialMeta)?.generation;
    const dataKey = this.dataKey(streamId, generation);

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

      const currentMeta = await this.client.get(metaKey);
      if (currentMeta === null) return;
      if (parseMeta(currentMeta)?.generation !== generation) return;

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
    this.acquiredGenerations.delete(streamId);
    const meta = await this.readMeta(streamId);
    await this.client.del([
      this.metaKey(streamId),
      ...new Set([
        this.dataKey(streamId, meta?.generation),
        this.dataKey(streamId),
      ]),
    ]);
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

  private dataKey(streamId: string, generation?: string): string {
    const base = `${this.keyPrefix}:{${streamId}}:data`;
    return generation ? `${base}:${generation}` : base;
  }
}

type ParsedMeta = {
  status?: string;
  error?: string;
  ttlSec?: number;
  generation?: string;
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

const SHARED_DECODER = new TextDecoder();
const SHARED_ENCODER = new TextEncoder();

function readString(
  value: string | Uint8Array | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  return SHARED_DECODER.decode(value);
}

function toBytes(value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) return value;
  return SHARED_ENCODER.encode(value);
}
