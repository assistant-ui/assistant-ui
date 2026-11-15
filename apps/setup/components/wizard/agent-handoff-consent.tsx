"use client";

import { useId, useState } from "react";
import type { CheckoutContextValue } from "@/components/checkout-provider";
import { agentKindName } from "@/lib/agents";

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/** What the user confirms: the agent as it reports itself, and the setup server. */
const handoffIdentity = (
  checkout: Pick<CheckoutContextValue, "state" | "url">,
) =>
  JSON.stringify([
    checkout.url,
    checkout.state?.id ?? null,
    checkout.state?.agent.cwd ?? null,
    checkout.state?.agent.kind ?? null,
  ]);

/**
 * The user's confirmation, bound to the agent it was given for. If the agent
 * the page shows changes, the confirmation no longer counts.
 */
export const useHandoffConsent = (
  checkout: Pick<CheckoutContextValue, "state" | "url">,
) => {
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
  const identity = handoffIdentity(checkout);
  return {
    confirmed: confirmedFor === identity,
    setConfirmed: (checked: boolean) =>
      setConfirmedFor(checked ? identity : null),
  };
};

/**
 * Names the agent an API key or a sign-in goes to, and asks the user to
 * confirm they started it. Anyone can send a setup link, so connecting to a
 * setup is not enough to hand its agent a key or an account.
 */
export function AgentHandoffConsent({
  checkout,
  handoff,
  checked,
  onCheckedChange,
}: {
  checkout: Pick<CheckoutContextValue, "state" | "url">;
  handoff: "key" | "sign-in";
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const agent = checkout.state?.agent;
  const folder = agent?.cwd || "an unknown folder";
  const name = agentKindName(agent?.kind) ?? "an unknown agent";
  return (
    <div className="flex flex-col gap-2 text-base sm:text-sm">
      <p className="text-muted-foreground" data-testid="agent-handoff">
        {handoff === "key"
          ? "Your key goes to the coding agent that says it runs in "
          : "Signing in lets the coding agent that says it runs in "}
        <span className="text-foreground font-mono text-[0.9em] wrap-anywhere">
          {folder}
        </span>{" "}
        on {name}
        {handoff === "key"
          ? `, through ${hostOf(checkout.url)}.`
          : " use your assistant-ui account."}
      </p>
      <label htmlFor={id} className="flex items-start gap-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>I started this setup from my own coding agent.</span>
      </label>
    </div>
  );
}
