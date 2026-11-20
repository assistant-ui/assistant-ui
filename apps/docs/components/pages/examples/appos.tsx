"use client";

import {
  AppOSApp,
  aiGateway,
  type AiService,
  type AiStreamPart,
} from "appos-host";
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

export function AppOSExample({ src }: { src: string }) {
  return (
    <AppOSApp
      src={src}
      services={{ ai }}
      permissions={{ ai: "granted" }}
      {...(sandbox ? { sandbox } : {})}
      className="h-full w-full"
    />
  );
}
