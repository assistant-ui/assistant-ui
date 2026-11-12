"use client";

import { useMemo } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { StatewireWebsocket, useStatewire } from "statewire";
import { Button } from "@/components/ui/button";
import { agentKindName } from "@/lib/agents";
import { isAgentPresent, type Checkout } from "@/lib/checkout/protocol";
import { checkoutUrl } from "@/lib/checkout/session-store";
import { parseCheckoutState } from "@/lib/checkout/wire-state";
import {
  pageColumnClassName,
  pageTitleClassName,
} from "@/components/setup-frame";

/** The agent a link belongs to, once it is running and has said where. */
export const presentAgent = (state: Checkout.State | undefined) => {
  if (state === undefined || !isAgentPresent(state) || !state.agent.cwd)
    return undefined;
  return {
    cwd: state.agent.cwd,
    name: agentKindName(state.agent.kind) ?? "an unknown agent",
  };
};

/**
 * Asks before this browser joins a setup a link opened. Anyone can mint a
 * link and send it, and the agent behind it sees every answer, API keys
 * included, so nothing is joined, stored or answered until the user says so.
 * The page only reads the link meanwhile.
 */
export function AgentLinkConfirm({
  link,
  onConnect,
  onCancel,
}: {
  link: string;
  onConnect: () => void;
  onCancel: () => void;
}) {
  const wire = useStatewire<unknown, Checkout.Commands>({
    transport: StatewireWebsocket({ url: checkoutUrl(link) }),
  });
  const state = useMemo(() => parseCheckoutState(wire.state), [wire.state]);
  const agent = presentAgent(state);
  return (
    <section
      aria-labelledby="agent-link-confirm-title"
      className={pageColumnClassName}
    >
      {agent ? (
        <>
          <h1 id="agent-link-confirm-title" className={pageTitleClassName}>
            Connect this browser to the coding agent running in{" "}
            <span className="font-mono text-[0.85em] wrap-anywhere">
              {agent.cwd}
            </span>{" "}
            on {agent.name}?
          </h1>
          <p className="text-muted-foreground mt-4 max-w-[60ch] text-sm leading-relaxed">
            Connect only if you just asked your own coding agent to set up
            assistant-ui. The agent sees every answer you give here, including
            API keys.
          </p>
          <div className="mt-8 flex gap-2">
            <Button onClick={onConnect}>Connect</Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 id="agent-link-confirm-title" className={pageTitleClassName}>
            Waiting for your coding agent
          </h1>
          <p
            role="status"
            className="text-muted-foreground mt-4 flex items-center gap-2 text-sm"
          >
            <LoaderCircleIcon
              aria-hidden="true"
              className="size-4 shrink-0 motion-safe:animate-spin"
            />
            This link asks to connect to a coding agent. It appears here once
            the agent is running.
          </p>
          <div className="mt-8">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
