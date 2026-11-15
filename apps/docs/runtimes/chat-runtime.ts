"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AssistantCloud,
  WebSpeechDictationAdapter,
  WebSpeechSynthesisAdapter,
  createSuggestionAdapter,
  readAnonymousRefreshToken,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
  type UseChatRuntimeOptions,
} from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";
import { followAnalyticsConsent } from "@/lib/consent";
import { refreshDemoUsage } from "@/lib/demo-usage-client";
import { useSession } from "@/lib/session";

type Adapters = UseChatRuntimeOptions["adapters"];

// Engagement events (copies, suggestion clicks, branch switches) are analytics,
// so they start off and follow the consent banner; see useEngagementConsent.
// Run reports and stored threads are how the assistant works and stay on.
const cloudTelemetry = {
  events: false,
  ...(process.env.NEXT_PUBLIC_VERCEL_ENV
    ? { environment: process.env.NEXT_PUBLIC_VERCEL_ENV }
    : {}),
  ...(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ? { release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7) }
    : {}),
};

export const followUpSuggestionAdapter = createSuggestionAdapter({
  count: 3,
  maxMessages: 6,
  instructions:
    "Prefer follow-ups that exercise a different capability than the last reply: a deeper question on the same topic, a request to visualize or diagram it, or a request to remember a preference. Keep each under 60 characters.",
  async complete({ prompt, signal }) {
    try {
      const response = await anonymousSessionFetch("/api/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
        ...(signal ? { signal } : {}),
      });
      if (!response.ok) return [];

      const body = (await response.json()) as { suggestions?: unknown };
      return Array.isArray(body.suggestions)
        ? body.suggestions.filter(
            (suggestion): suggestion is string =>
              typeof suggestion === "string",
          )
        : [];
    } catch {
      return [];
    }
  },
});

let claim: { key: string; request: Promise<number | null> } | null = null;

// A docs page mounts several surfaces, each running its own useDocsCloud, and
// they mount and unmount at different times as the visitor navigates. Cloud
// moves the anonymous threads on the first POST and reports moved: 0 to every
// later one, which would leave those surfaces with a stale thread list, so the
// claim is made once per signed-in visitor and every caller reads its result.
const claimAnonymousThreads = (baseUrl: string, userKey: string) => {
  if (claim?.key === userKey) return claim.request;

  const refreshToken = readAnonymousRefreshToken(baseUrl);
  if (!refreshToken) return null;

  const request: Promise<number | null> = fetch("/api/demo/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const payload = (await response.json()) as { moved?: unknown };
      refreshDemoUsage();
      return typeof payload.moved === "number" ? payload.moved : 0;
    })
    .catch(() => null);

  claim = { key: userKey, request };
  void request.then((moved) => {
    if (moved === null && claim?.request === request) claim = null;
  });

  return request;
};

export function useDocsCloud() {
  const session = useSession();
  const accountOwned = session.status === "signed-in" && session.cloudHistory;
  const userKey = accountOwned ? session.user.email : null;
  const baseUrl = process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!;
  const [claimedFor, setClaimedFor] = useState<string | null>(null);
  const [claims, setClaims] = useState(0);

  useEffect(() => {
    if (userKey === null || claimedFor === userKey) return;
    const request = claimAnonymousThreads(baseUrl, userKey);
    if (!request) return;

    let cancelled = false;
    void request.then((moved) => {
      if (cancelled || moved === null) return;
      setClaimedFor(userKey);
      if (moved > 0) setClaims((count) => count + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [baseUrl, claimedFor, userKey]);

  const cloud = useMemo(
    () =>
      userKey !== null
        ? new AssistantCloud({
            baseUrl,
            telemetry: cloudTelemetry,
            authToken: async () => {
              try {
                const response = await fetch("/api/assistant-token", {
                  cache: "no-store",
                  credentials: "same-origin",
                });
                if (!response.ok) return null;
                const payload = (await response.json()) as { token?: unknown };
                return typeof payload.token === "string" ? payload.token : null;
              } catch {
                return null;
              }
            },
          })
        : new AssistantCloud({
            baseUrl,
            anonymous: true,
            telemetry: cloudTelemetry,
          }),
    [baseUrl, userKey],
  );

  useEngagementConsent(cloud);

  return { cloud, claims };
}

/** Turns a cloud's engagement events on and off with analytics consent. */
export function useEngagementConsent(cloud: AssistantCloud | undefined) {
  useEffect(() => {
    if (!cloud) return;
    return followAnalyticsConsent((allowed) => {
      cloud.telemetry.events = allowed;
    });
  }, [cloud]);
}

/**
 * Stands in for the runtime's built-in anonymous cloud, which sends engagement
 * events with no consent check. Returns undefined when `enabled` is false or
 * the site has no Assistant Cloud URL, the same cases where the runtime would
 * not use its own.
 */
export function useAnonymousDocsCloud(enabled = true) {
  const baseUrl = process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;
  const cloud = useMemo(
    () =>
      enabled && baseUrl
        ? new AssistantCloud({
            baseUrl,
            anonymous: true,
            telemetry: { events: false },
          })
        : undefined,
    [enabled, baseUrl],
  );
  useEngagementConsent(cloud);
  return cloud;
}

const subscribeToNothing = () => () => {};
const dictationUnsupportedOnServer = () => false;

// The server snapshot reports no support, so hydration matches and the mic
// only appears in browsers that can listen.
const useDictationSupported = () =>
  useSyncExternalStore(
    subscribeToNothing,
    WebSpeechDictationAdapter.isSupported,
    dictationUnsupportedOnServer,
  );

// Speech and dictation adapters carry per-utterance state, so a surface keeps
// one instance rather than rebuilding them on every render.
export function useSpeechAdapters({ dictation = false } = {}) {
  const dictationSupported = useDictationSupported() && dictation;

  const speech = useMemo(() => new WebSpeechSynthesisAdapter(), []);
  const dictationAdapter = useMemo(
    () => (dictationSupported ? new WebSpeechDictationAdapter() : undefined),
    [dictationSupported],
  );

  return useMemo(
    () => ({
      speech,
      ...(dictationAdapter ? { dictation: dictationAdapter } : {}),
    }),
    [speech, dictationAdapter],
  );
}

export function useDocsChatRuntime({
  api,
  cloud,
  adapters,
  sendAutomatically = false,
  searchDocs = false,
  countConversations = false,
}: {
  api?: string;
  cloud?: AssistantCloud;
  adapters?: Adapters;
  sendAutomatically?: boolean;
  searchDocs?: boolean;
  countConversations?: boolean;
} = {}) {
  const anonymousCloud = useAnonymousDocsCloud(!cloud);
  const runtimeCloud = cloud ?? anonymousCloud;
  return useChatRuntime({
    transport: new AssistantChatTransport({
      ...(api ? { api } : {}),
      ...(searchDocs || countConversations
        ? {
            body: {
              ...(searchDocs ? { searchDocs: true } : {}),
              ...(countConversations ? { countConversations: true } : {}),
            },
          }
        : {}),
      fetch: anonymousSessionFetch,
    }),
    ...(sendAutomatically
      ? { sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls }
      : {}),
    ...(adapters ? { adapters } : {}),
    ...(runtimeCloud ? { cloud: runtimeCloud } : {}),
  });
}
