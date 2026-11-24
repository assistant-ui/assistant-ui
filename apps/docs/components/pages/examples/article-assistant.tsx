"use client";

import {
  AppOSApp,
  aiGateway,
  type AiService,
  type AiStreamPart,
} from "appos-host";
import { useTheme } from "next-themes";
import { useHydrated } from "@/hooks/use-hydrated";
import { ensureAnonymousSession } from "@/lib/anonymous-session-client";

const gateway = aiGateway({ url: "/api/appos/ai" });

/**
 * The docs' AI gateway, after the public assistant's anonymous session: the
 * session route sets its cookie, which the gateway's same-origin fetch sends.
 */
const ai: AiService = async function* (request) {
  await ensureAnonymousSession();
  // aiGateway's service is an async generator.
  yield* gateway(request) as AsyncIterable<AiStreamPart>;
};

/** A local appOS sandbox for development, e.g. http://{key}.localhost:10032; default the hosted one. */
const sandbox = process.env.NEXT_PUBLIC_APPOS_SANDBOX;

/** The Article Assistant example, embedded with appos-host. */
export function ArticleAssistantExample({ src }: { src: string }) {
  // The docs' theme toggle (next-themes): the app follows it, live. The
  // server doesn't know the theme, so "system" until hydrated.
  const { resolvedTheme } = useTheme();
  const hydrated = useHydrated();
  const colorScheme =
    hydrated && (resolvedTheme === "dark" || resolvedTheme === "light")
      ? resolvedTheme
      : "system";
  return (
    <AppOSApp
      src={src}
      title="Article Assistant example"
      services={{ ai }}
      permissions={{ ai: "granted" }}
      colorScheme={colorScheme}
      {...(sandbox ? { sandbox } : {})}
      className="h-full w-full"
    />
  );
}
