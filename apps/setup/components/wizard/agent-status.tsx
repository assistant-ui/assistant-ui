"use client";

import type { ReactNode } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentKindIcon } from "@/components/agent-kind-icon";
import type { CheckoutContextValue } from "@/components/checkout-provider";
import { agentKindName } from "@/lib/agents";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

export const agentPrompt = (url: string, products: readonly string[]) =>
  `Install ${new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(products)}.\nRun \`npx setup-agent ${url}\` to fetch installation steps.`;

export type AgentPhase =
  | "unconnected"
  | "waiting"
  | "connected"
  | "quiet"
  | "finished"
  | "stopped";

export const agentPhase = (checkout: CheckoutContextValue): AgentPhase => {
  const { state } = checkout;
  const status = state?.status ?? "waiting";
  if (status === "done") return "finished";
  if (status === "cancelled") return "stopped";
  const everConnected = (state?.agent.lastSeenAt ?? null) !== null;
  if (!everConnected)
    return state?.agent.introducedAt != null ? "waiting" : "unconnected";
  return checkout.agentPresent ? "connected" : "quiet";
};

/** The agent's display name, as the CLI reported its kind. */
export const useAgentName = (checkout: CheckoutContextValue) =>
  agentKindName(checkout.state?.agent.kind) ?? "your agent";

const relativeTime = (at: number, now: number) => {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1800,
  });
  return (
    <Button
      aria-label={label}
      onClick={() => {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
          toast.error("Could not copy to the clipboard");
          return;
        }
        copyToClipboard(text);
      }}
    >
      {isCopied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      {isCopied ? "Copied" : label}
    </Button>
  );
}

function AgentSnippet({
  url,
  products,
  actions,
}: {
  url: string;
  products: string[];
  actions?: ReactNode;
}) {
  const text = agentPrompt(url, products);
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document w-full p-4 font-mono text-[13px] leading-6 wrap-anywhere whitespace-pre-wrap [font-variant-ligatures:none]">
        {text}
      </div>
      <div className="flex items-center gap-2">
        <CopyButton text={text} label="Copy prompt" />
        {actions}
      </div>
    </div>
  );
}

function QuietBody({
  url,
  products,
  actions,
}: {
  url: string;
  products: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Paste this prompt into your coding agent and it picks up where it left
        off.
      </p>
      <AgentSnippet url={url} products={products} actions={actions} />
    </div>
  );
}

const dotClassName = (phase: AgentPhase) =>
  cn(
    phase === "connected" && "bg-blue-500",
    phase === "waiting" && "bg-foreground/50 animate-pulse",
    phase === "quiet" && "bg-amber-500",
    phase === "finished" && "bg-foreground",
    (phase === "unconnected" || phase === "stopped") && "bg-foreground/20",
  );

function StatusDot({
  phase,
  className,
}: {
  phase: AgentPhase;
  className: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-background absolute size-3 rounded-full border-2",
        className,
        dotClassName(phase),
      )}
    />
  );
}

/** The agent's mark with its phase on the corner, for the wizard's footer; it opens the messages. Nothing until the agent has connected once. */
export function AgentIndicator({
  checkout,
  unread,
  onClick,
}: {
  checkout: CheckoutContextValue;
  unread: number;
  onClick: () => void;
}) {
  const phase = agentPhase(checkout);
  const name = useAgentName(checkout);
  const status = checkout.state?.status;
  const needsYou = checkout.openInputs.length > 0 || checkout.planPending;
  if (phase === "unconnected" || phase === "waiting") return null;
  const label = checkout.degraded
    ? "Reconnecting…"
    : phase === "quiet"
      ? `${name} disconnected`
      : phase === "finished"
        ? "Setup finished"
        : phase === "stopped"
          ? "Setup cancelled"
          : needsYou
            ? `${name} needs you`
            : status === "planning"
              ? `${name} is exploring`
              : status === "installing"
                ? `${name} is working`
                : `${name} connected`;
  return (
    <button
      type="button"
      data-testid="agent-indicator"
      title={label}
      onClick={onClick}
      className="border-foreground/10 text-muted-foreground hover:border-foreground/30 hover:text-foreground focus-visible:ring-ring relative flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <AgentKindIcon kind={checkout.state?.agent.kind} className="size-4" />
      <span
        aria-hidden
        className={cn(
          "border-background absolute -top-0.5 -right-0.5 size-3 rounded-full border-2",
          checkout.degraded
            ? "animate-pulse bg-amber-500"
            : dotClassName(phase),
        )}
      />
      {unread > 0 ? (
        <span
          aria-hidden
          className="bg-foreground text-background absolute -right-1.5 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-medium"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
      <span className="sr-only">
        {`Messages. ${label}.${unread > 0 ? ` ${unread} unread.` : ""}`}
      </span>
    </button>
  );
}

/** The agent's mark with a dot for its connection phase. */
export function AgentAvatar({ checkout }: { checkout: CheckoutContextValue }) {
  return (
    <span className="border-foreground/10 relative flex size-9 shrink-0 items-center justify-center rounded-full border">
      <AgentKindIcon kind={checkout.state?.agent.kind} className="size-4" />
      <StatusDot
        phase={agentPhase(checkout)}
        className="-right-0.5 -bottom-0.5"
      />
    </span>
  );
}

export function AgentStatus({
  checkout,
  inline = false,
  quietActions,
}: {
  checkout: CheckoutContextValue;
  inline?: boolean;
  quietActions?: ReactNode;
}) {
  const phase = agentPhase(checkout);
  const name = useAgentName(checkout);
  const { state } = checkout;
  const cwd = state?.agent.cwd ?? null;
  const lastSeen = state?.agent.lastSeenAt ?? null;
  const products = state?.products.length
    ? state.products.map((product) => product.name)
    : [...checkout.session.products];

  const line = (() => {
    switch (phase) {
      case "unconnected":
        return "Not connected yet";
      case "waiting":
        return "Agent detected";
      case "connected":
        return cwd ? `Connected, working in ${cwd}` : "Connected";
      case "quiet":
        return lastSeen === null
          ? "Gone quiet"
          : `Gone quiet, last seen ${relativeTime(lastSeen, Date.now())}`;
      case "finished":
        return "Finished";
      case "stopped":
        return "Stopped";
    }
  })();

  const body =
    phase === "quiet" && !checkout.degraded ? (
      <QuietBody
        url={checkout.url}
        products={products}
        actions={quietActions}
      />
    ) : null;

  if (inline && body)
    return <section aria-label="Connect agent">{body}</section>;

  return (
    <section
      aria-label="Agent status"
      className={cn(
        "rounded-document border",
        body ? "border-foreground" : "border-foreground/10",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <AgentAvatar checkout={checkout} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{name}</p>
          <p
            role="status"
            className="text-muted-foreground truncate text-sm"
            title={line}
          >
            {line}
          </p>
        </div>
      </div>
      {body ? (
        <div className="border-foreground/10 border-t px-4 py-4 sm:px-5">
          {body}
        </div>
      ) : null}
    </section>
  );
}
