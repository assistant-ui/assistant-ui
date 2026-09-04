import "server-only";

import { Redis } from "@upstash/redis";
import { getSession } from "./accounts-auth";
import {
  conversationLimitFor,
  createConversationCounter,
  nextReset,
  type ConversationUsage,
} from "./conversation-limit";

const PREFIX = "aui:www:conversations:";

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

export async function readDemoUsage(
  identity: DemoIdentity,
): Promise<ConversationUsage> {
  const store = conversationCounter();
  if (!store) return unlimited(identity.limit);
  return store
    .read(identity.identity, identity.limit)
    .catch(() => unlimited(identity.limit));
}

export async function claimConversation(
  identity: DemoIdentity,
  threadId: string,
): Promise<{ allowed: boolean; usage: ConversationUsage }> {
  const store = conversationCounter();
  if (!store) return { allowed: true, usage: unlimited(identity.limit) };
  // The cap is friction, not a security boundary, so a counter that cannot be
  // reached lets the conversation through instead of refusing it.
  return store
    .claim(identity.identity, threadId, identity.limit)
    .catch(() => ({ allowed: true, usage: unlimited(identity.limit) }));
}
