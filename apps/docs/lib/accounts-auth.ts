import "server-only";

import { Redis } from "@upstash/redis";
import { after } from "@farm.js/core/after";
import {
  createAccountsAuth,
  createMemorySessionStore,
  type AccountsFetchOptions,
} from "aui-auth";
import { createAesGcmCodec } from "aui-auth/database";
import { createRedisSessionStore } from "aui-auth/database/redis";
import { headers } from "@farm.js/core/headers";

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

/** What every call to the accounts API from this app starts from; null until the deployment names an issuer. */
export const accountsOptions: AccountsFetchOptions | null = issuer
  ? { issuer }
  : null;

// The session cookies ride the request headers, which the auth client reads from a Request.
const currentRequest = async () =>
  new Request("http://localhost/", { headers: new Headers(await headers()) });

export const getSession = accounts
  ? async () => accounts.sessionFromRequest(await currentRequest())
  : async () => null;

/** A fresh access token for the request's session, refreshed when it is about to expire; null when signed out. */
export const getAccessToken = accounts
  ? async () => accounts.accessTokenFromRequest(await currentRequest())
  : async (): Promise<string | null> => null;
