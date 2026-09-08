import "server-only";

import { Redis } from "@upstash/redis";
import { after } from "next/server";
import { createAccountsAuth, createMemorySessionStore } from "aui-auth";
import { createAesGcmCodec } from "aui-auth/database";
import { createRedisSessionStore } from "aui-auth/database/redis";
import { withNextRequestScope } from "aui-auth/next";

export type DocsSessionData = Record<string, never>;

const issuer = process.env.NEXT_PUBLIC_AUTH_URL;
const clientId = process.env.DOCS_OIDC_CLIENT_ID;
const encryptionKey = process.env.ENCRYPTION_KEY;
const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// A deployment spreads requests across instances, so its sessions only survive
// in Redis. A dev server is one process, and keeping its sessions in memory is
// what lets sign-in run locally without the production store's credentials.
const store =
  encryptionKey && hasRedis
    ? createRedisSessionStore<DocsSessionData>({
        redis: Redis.fromEnv(),
        codec: createAesGcmCodec(encryptionKey),
        prefix: "aui:www:session:",
      })
    : process.env.NODE_ENV === "development"
      ? createMemorySessionStore<DocsSessionData>()
      : null;

// Docs is a public site that happens to offer sign-in, so an unconfigured
// deployment serves every page as a signed-out visitor rather than failing.
export const accounts =
  issuer && clientId && encryptionKey && store
    ? createAccountsAuth<DocsSessionData>({
        issuer,
        clientId,
        cookieName: "assistant-ui.www_session",
        cache: { secret: encryptionKey },
        store,
        // The account row renders the name and the avatar, so a profile edited
        // on accounts has to reach the session; the re-read runs after the
        // response rather than in front of it.
        revalidateUser: true,
        deferRevalidation: after,
      })
    : null;

export const getSession = accounts
  ? withNextRequestScope(accounts).getSession
  : async () => null;
