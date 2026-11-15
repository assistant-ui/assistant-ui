"use client";

import { useId } from "react";
import type { CheckoutContextValue } from "@/components/checkout-provider";
import { agentKindName } from "@/lib/agents";

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
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
          ? "Your key goes to the coding agent in "
          : "Signing in lets the coding agent in "}
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
