import "server-only";

import { Redis } from "@upstash/redis";
import { createAccountsAuth } from "aui-auth";
import { createAesGcmCodec } from "aui-auth/database";
import { withNextRequestScope } from "aui-auth/next";
import { createRedisSessionStore } from "./session-store";

// Sign-in carries no app state: threads stay anonymous and memories stay in the
// browser, so the session exists only to name the visitor.
export type DocsSessionData = Record<string, never>;

const issuer = process.env.NEXT_PUBLIC_AUTH_URL;
const clientId = process.env.DOCS_OIDC_CLIENT_ID;
const encryptionKey = process.env.ENCRYPTION_KEY;
const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Docs is a public site that happens to offer sign-in, so an unconfigured
// deployment serves every page as a signed-out visitor rather than failing.
export const accounts =
  issuer && clientId && encryptionKey && hasRedis
    ? createAccountsAuth<DocsSessionData>({
        issuer,
        clientId,
        cookieName: "assistant-ui.www_session",
        cache: { secret: encryptionKey },
        store: createRedisSessionStore<DocsSessionData>({
          redis: Redis.fromEnv(),
          codec: createAesGcmCodec(encryptionKey),
          prefix: "aui:www:session:",
        }),
        onSignIn: async () => ({}),
        onRevalidate: async () => ({}),
      })
    : null;

export const getSession = accounts
  ? withNextRequestScope(accounts).getSession
  : async () => null;
