import type { Redis } from "@upstash/redis";
import type {
  AccountsSession,
  AccountsSessionPatch,
  AccountsSessionStore,
  SessionCodec,
} from "aui-auth/database";

// Sessions carry their own absolute and idle limits, so the key expiry is only
// garbage collection and sits beyond the longest lifetime aui-auth will honour.
const DEFAULT_TTL_MS = 31 * 24 * 60 * 60 * 1000;

const LEASE_FIELD = "refreshLeaseUntil";

// A write that carries ifLeaseUntil is a refresher proving it still holds the
// lease, so the check and the write have to land in one round trip.
const UPDATE_SCRIPT = `
local key, checkLease, expectedLease, ttl = KEYS[1], ARGV[1], ARGV[2], ARGV[3]
if redis.call('EXISTS', key) == 0 then return 0 end
if checkLease == '1' then
  local current = redis.call('HGET', key, '${LEASE_FIELD}')
  if (current or '') ~= expectedLease then return 0 end
end
for index = 4, #ARGV, 2 do
  if ARGV[index + 1] == '' then
    redis.call('HDEL', key, ARGV[index])
  else
    redis.call('HSET', key, ARGV[index], ARGV[index + 1])
  end
end
redis.call('PEXPIRE', key, ttl)
return 1
`;

const CLAIM_SCRIPT = `
local key, until_, now, ttl = KEYS[1], ARGV[1], ARGV[2], ARGV[3]
if redis.call('EXISTS', key) == 0 then return nil end
local current = redis.call('HGET', key, '${LEASE_FIELD}')
if current and current ~= '' and tonumber(current) > tonumber(now) then
  return nil
end
redis.call('HSET', key, '${LEASE_FIELD}', until_)
redis.call('PEXPIRE', key, ttl)
return redis.call('HGETALL', key)
`;

const DELETE_SCRIPT = `
local key, checkLease, expectedLease = KEYS[1], ARGV[1], ARGV[2]
if checkLease == '1' then
  local current = redis.call('HGET', key, '${LEASE_FIELD}')
  if (current or '') ~= expectedLease then return 0 end
end
redis.call('DEL', key)
return 1
`;

export type RedisSessionStoreOptions = {
  redis: Redis;
  codec: SessionCodec;
  prefix?: string;
  ttlMs?: number;
};

type Fields = Record<string, string>;

// Upstash parses values that look like JSON, so every field is read back
// through a coercion rather than trusted to arrive as it was written.
function asString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function asNumber(value: unknown): number {
  const text = asString(value);
  const parsed = text === null ? Number.NaN : Number(text);
  if (!Number.isFinite(parsed)) {
    throw new Error("Unexpected timestamp in accounts session hash");
  }
  return parsed;
}

// Upstash decodes what parses and hands back the raw string otherwise, so a
// Data that is not an object arrives already decoded.
function asJson<T>(value: unknown): T {
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

function fromEntries(entries: unknown): Record<string, unknown> | null {
  if (!entries) return null;
  if (Array.isArray(entries)) {
    if (entries.length === 0) return null;
    const row: Record<string, unknown> = {};
    for (let index = 0; index < entries.length; index += 2) {
      row[String(entries[index])] = entries[index + 1];
    }
    return row;
  }
  const row = entries as Record<string, unknown>;
  return Object.keys(row).length > 0 ? row : null;
}

export function createRedisSessionStore<Data>(
  options: RedisSessionStoreOptions,
): AccountsSessionStore<Data> {
  const { redis, codec } = options;
  const prefix = options.prefix ?? "aui:session:";
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const key = (id: string) => `${prefix}${id}`;

  async function encodeFields(
    patch: AccountsSessionPatch<Data>,
  ): Promise<Fields> {
    const fields: Fields = {};
    if (patch.user) fields.user = JSON.stringify(patch.user);
    if (patch.data !== undefined) fields.data = JSON.stringify(patch.data);
    if (patch.lastValidatedAt !== undefined) {
      fields.lastValidatedAt = String(patch.lastValidatedAt);
    }
    if (patch.refreshLeaseUntil !== undefined) {
      fields[LEASE_FIELD] =
        patch.refreshLeaseUntil === null ? "" : String(patch.refreshLeaseUntil);
    }
    if (patch.tokens) {
      const { accessToken, refreshToken, idToken, accessTokenExpiresAt } =
        patch.tokens;
      fields.accessToken = await codec.encrypt(accessToken);
      fields.refreshToken = refreshToken
        ? await codec.encrypt(refreshToken)
        : "";
      fields.idToken = idToken ? await codec.encrypt(idToken) : "";
      fields.accessTokenExpiresAt = String(accessTokenExpiresAt);
    }
    return fields;
  }

  async function decodeRow(
    id: string,
    row: Record<string, unknown>,
  ): Promise<AccountsSession<Data>> {
    const refreshToken = asString(row.refreshToken);
    const idToken = asString(row.idToken);
    const lease = asString(row[LEASE_FIELD]);
    return {
      id,
      user: asJson(row.user),
      tokens: {
        accessToken: await codec.decrypt(asString(row.accessToken) ?? ""),
        refreshToken: refreshToken ? await codec.decrypt(refreshToken) : null,
        idToken: idToken ? await codec.decrypt(idToken) : null,
        accessTokenExpiresAt: asNumber(row.accessTokenExpiresAt),
      },
      data: asJson(row.data),
      createdAt: asNumber(row.createdAt),
      lastValidatedAt: asNumber(row.lastValidatedAt),
      refreshLeaseUntil: lease === null ? null : Number(lease),
    };
  }

  return {
    async create(session) {
      const fields = await encodeFields(session);
      fields.createdAt = String(session.createdAt);
      const populated = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== ""),
      );
      await redis.hset(key(session.id), populated);
      await redis.pexpire(key(session.id), ttlMs);
    },

    async read(id) {
      const row = fromEntries(await redis.hgetall(key(id)));
      return row ? decodeRow(id, row) : null;
    },

    async update(id, patch, ifLeaseUntil?: number) {
      const fields = await encodeFields(patch);
      const args: string[] = [
        ifLeaseUntil === undefined ? "0" : "1",
        ifLeaseUntil === undefined ? "" : String(ifLeaseUntil),
        String(ttlMs),
        ...Object.entries(fields).flat(),
      ];
      const applied = await redis.eval<string[], number>(
        UPDATE_SCRIPT,
        [key(id)],
        args,
      );
      if (applied !== 1) return null;
      const row = fromEntries(await redis.hgetall(key(id)));
      return row ? decodeRow(id, row) : null;
    },

    async claimRefreshLease(id, until, now) {
      const entries = await redis.eval<string[], unknown>(
        CLAIM_SCRIPT,
        [key(id)],
        [String(until), String(now), String(ttlMs)],
      );
      const row = fromEntries(entries);
      return row ? decodeRow(id, row) : null;
    },

    async delete(id, ifLeaseUntil?: number) {
      await redis.eval<string[], number>(
        DELETE_SCRIPT,
        [key(id)],
        [
          ifLeaseUntil === undefined ? "0" : "1",
          ifLeaseUntil === undefined ? "" : String(ifLeaseUntil),
        ],
      );
    },
  };
}
