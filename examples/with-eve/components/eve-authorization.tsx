"use client";

import type { EveAuthorizationData } from "@assistant-ui/eve";
import { makeAssistantDataUI } from "@assistant-ui/react";

export const EveAuthorization = makeAssistantDataUI<EveAuthorizationData>({
  name: "authorization",
  render: ({ data }) => {
    const label = data.displayName ?? data.name;

    if (data.state !== "required") {
      // Eve inherits `description` from the pending part, so a settled
      // authorization still reads as a sign-in prompt.
      const suffix = data.reason ? ` (${data.reason})` : "";
      return (
        <div className="text-muted-foreground my-2 text-sm">
          {data.outcome === "authorized"
            ? `${label} connected.`
            : `${label} authorization ${data.outcome ?? "completed"}${suffix}.`}
        </div>
      );
    }

    return (
      <div className="my-2 flex flex-col items-start gap-2 rounded-lg border p-4">
        <p className="text-sm">
          {data.instructions ?? `Sign in to ${label} to continue.`}
        </p>
        {data.userCode && (
          <code className="bg-muted rounded px-2 py-1 font-mono text-sm">
            {data.userCode}
          </code>
        )}
        {data.url && (
          <a
            className="text-sm underline"
            href={data.url}
            target="_blank"
            rel="noreferrer"
          >
            Continue to sign in
          </a>
        )}
      </div>
    );
  },
});
