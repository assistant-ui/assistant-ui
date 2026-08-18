# Hosted AI access controls

The docs assistant and UI Builder chat remain public. AI Builder (Xulux), its
chat routes, guided `/learn` pages, and workspace downloads require a verified
Clerk user. `/learn/preview/*` remains public because it serves the inert stage
preview loaded by the authenticated course.

Anonymous access is deliberately bounded rather than treated as proof of a
human. A signed session is a soft per-session quota: a caller can discard it
and request another. The daily trusted-IP limit, global request limit, session
issuance limit, and provider spend controls are the durable cost backstops.

## Deployment prerequisites

Configure these values for both Preview and Production before merging or
promoting the application:

- `AUI_ANONYMOUS_SESSION_SECRET`: at least 32 random bytes, generated with a
  secret manager or `openssl rand -base64 32`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: a production Redis
  instance shared by all application instances.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: values from the
  same Clerk instance.
- A Clerk JWT template named `assistant-ui`.
- Assistant Cloud configured to accept that JWT template and reject anonymous
  access for the AI Builder project.
- Provider-side spend alerts and a hard spend ceiling. The application global
  request limit is not an exact dollar budget.

Set deliberate Preview and Production values for:

- `AUI_IP_REQUESTS_PER_DAY`
- `AUI_IDENTITY_REQUESTS_PER_DAY`
- `AUI_GLOBAL_REQUESTS_PER_DAY`
- `AUI_ANONYMOUS_SESSIONS_PER_IP_PER_DAY`
- `AUI_DOWNLOAD_REQUESTS_PER_DAY`

`AUI_GLOBAL_REQUESTS_PER_DAY` has no deployment default. Measure peak daily
requests across `/api/doc/chat`, `/api/playground-chat`, and `/api/chat`,
including automatic tool-result follow-up requests. Set the ceiling above the
observed peak and below the provider hard-spend backstop. A global denial emits
the structured `global_inference_rate_limit_exceeded` error log and should page
the on-call owner. Missing or unavailable Redis fails closed with a structured
`rate_limit_unavailable` log and a `503` response.

Direct Vercel deployments use `x-vercel-forwarded-for`, which Vercel supplies
as a protected client-IP header. If another reverse proxy sits in front of
Vercel, it must remove caller-provided copies and overwrite a private header
with the verified client address. Set that header name in
`AUI_TRUSTED_CLIENT_IP_HEADER`. Do not set the variable without that proxy
contract. See [Vercel request headers](https://examples.vercel.com/docs/headers/request-headers).

## Staging verification

Before production promotion, verify all of the following on the deployment URL:

1. A public page remains cacheable and does not receive the anonymous session
   cookie in its document response.
2. `GET /api/anonymous-session` returns a signed, `HttpOnly`, `SameSite=Lax`
   cookie; repeated requests with that cookie do not rotate it.
3. Public chat requests without a valid cookie or signed session header return
   `401`; a forged allowed `Origin` does not change the result.
4. Valid public sessions reach input validation, and burst, daily IP, session,
   and global rejections return `429` before model selection.
5. Signed-out AI Builder navigation redirects to sign-in and returns to the
   complete playground URL, including existing query parameters.
6. Xulux chat and workspace downloads return `401` without Clerk auth and work
   for a signed-in staging user.
7. Switching Clerk users in one browser clears the previous Xulux local data.
   Existing ownerless data is adopted by the first authenticated user during
   rollout rather than deleted.
8. Assistant Cloud rejects a request without the `assistant-ui` JWT.
9. Redis counters and provider spend alerts are visible to the on-call owner.

## Rollback

Roll back the application deployment first. Keep Redis limits, the global
request ceiling, Vercel firewall rules, and provider spend controls enabled
during and after rollback; the previous application version exposes the public
inference routes without these application guards.

If Clerk or Assistant Cloud authentication fails after promotion, disable the
AI playground feature flag and roll back. Do not restore anonymous Assistant
Cloud access as a recovery step. Rotate `AUI_ANONYMOUS_SESSION_SECRET` only for
a suspected token-signing compromise because rotation invalidates every public
session immediately.
