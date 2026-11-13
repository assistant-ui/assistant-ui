import "server-only";

import { type AuiJson, resolveEnvironment } from "aui-auth";
import { createNextAuth, type NextAuth } from "aui-auth/next";
import aui from "@/aui.json";

/**
 * Sign-in through accounts with aui-auth 0.2: the session is the access token
 * in `__Host-aui.at`, verified on every request, and a refresh token accounts
 * rotates. Nothing is stored here. Production is the origin client
 * `https://www.assistant-ui.com` (aui.json), proven by the Vercel deployment;
 * tokens for the registered `urn:aui:assistant-ui-demo` still verify. Previews
 * and `next dev` sign in as `assistant-ui-demo-dev` through accounts.aui.dev.
 *
 * Signing in is optional on this site, so every page is public and the proxy
 * only refreshes the session in front of the routes that read it.
 */
let created: NextAuth | null | undefined;

// Docs is a public site that happens to offer sign-in, so a process that
// cannot name its environment (`next start` outside Vercel without
// `AUI_ENV`) serves every page as a signed-out visitor rather than failing.
export function docsAuth(): NextAuth | null {
  if (created === undefined) {
    try {
      created = createNextAuth(aui as AuiJson, { public: ["/:path*"] });
    } catch (error) {
      console.error("[auth] sign-in is not configured", error);
      created = null;
    }
  }
  return created;
}

/** The accounts origin this process signs in through, for accounts API calls; null when sign-in is off. */
export function accountsIssuer(): string | null {
  const auth = docsAuth();
  return auth ? resolveEnvironment(aui as AuiJson).issuer : null;
}

/** The session of this request, or null. The proxy refreshed it already. */
export async function getSession() {
  const auth = docsAuth();
  return auth ? auth.auth() : null;
}

/** The access token of this request's session; null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  return (await getSession())?.accessToken ?? null;
}
