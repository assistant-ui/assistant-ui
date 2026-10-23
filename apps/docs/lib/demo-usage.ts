import "server-only";

import { Redis } from "@upstash/redis";
import { getSession } from "./accounts-auth";
import {
  ANONYMOUS_CONVERSATIONS_PER_DAY,
  conversationLimitFor,
  createConversationCounter,
  nextReset,
  type ConversationUsage,
} from "./conversation-limit";

const PREFIX = "aui:www:conversations:";
const ANONYMOUS_CONVERSATIONS_PER_IP_PER_DAY =
  3 * ANONYMOUS_CONVERSATIONS_PER_DAY;

const hasRedis = () =>
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let counter: ReturnType<typeof createConversationCounter> | null = null;

function conversationCounter() {
  if (!hasRedis()) return null;
  counter ??= createConversationCounter(Redis.fromEnv(), PREFIX);
  return counter;
}

export type DemoIdentity = {
  identity: string;
  signedIn: boolean;
  limit: number;
};

// The signed-in visitor is counted under their accounts id, so clearing the
// anonymous cookie no longer resets the day.
export async function resolveDemoIdentity(
  anonymousSessionId: string,
): Promise<DemoIdentity> {
  const session = await getSession().catch(() => null);
  const signedIn = session !== null;
  return {
    identity: signedIn
      ? `user:${session.user.id}`
      : `anon:${anonymousSessionId}`,
    signedIn,
    limit: conversationLimitFor(signedIn),
  };
}

function unlimited(limit: number): ConversationUsage {
  return { used: 0, limit, remaining: limit, resetAt: nextReset(Date.now()) };
}

function withSharedCap(
  usage: ConversationUsage,
  capRemaining: number,
): ConversationUsage {
  if (capRemaining >= usage.remaining) return usage;
  return {
    ...usage,
    remaining: capRemaining,
    ...(capRemaining === 0 ? { sharedLimitReached: true } : {}),
  };
}

export async function readDemoUsage(
  identity: DemoIdentity,
  ip: string | null,
): Promise<ConversationUsage> {
  const store = conversationCounter();
  if (!store) return unlimited(identity.limit);
  try {
    const now = Date.now();
    const usage = await store.read(identity.identity, identity.limit, now);
    if (identity.signedIn || !ip) return usage;
    const ipUsage = await store.read(
      `ip:${ip}`,
      ANONYMOUS_CONVERSATIONS_PER_IP_PER_DAY,
      now,
    );
    return withSharedCap(usage, ipUsage.remaining);
  } catch {
    return unlimited(identity.limit);
  }
}

export async function claimConversation(
  identity: DemoIdentity,
  threadId: string,
  ip: string | null,
): Promise<{ allowed: boolean; usage: ConversationUsage }> {
  const store = conversationCounter();
  if (!store) return { allowed: true, usage: unlimited(identity.limit) };
  // The cap is friction, not a security boundary, so a counter that cannot be
  // reached lets the conversation through instead of refusing it.
  try {
    if (identity.signedIn || !ip)
      return await store.claim(identity.identity, threadId, identity.limit);
    const claim = await store.claimWithCap(
      identity.identity,
      threadId,
      identity.limit,
      `ip:${ip}`,
      `${identity.identity}:${threadId}`,
      ANONYMOUS_CONVERSATIONS_PER_IP_PER_DAY,
    );
    return {
      allowed: claim.allowed,
      usage: withSharedCap(
        claim.usage,
        Math.max(0, ANONYMOUS_CONVERSATIONS_PER_IP_PER_DAY - claim.capUsed),
      ),
    };
  } catch {
    return { allowed: true, usage: unlimited(identity.limit) };
  }
}

export async function mergeConversations(
  from: string,
  into: string,
): Promise<void> {
  const store = conversationCounter();
  if (!store) return;
  await store.merge(from, into).catch(() => {});
}
