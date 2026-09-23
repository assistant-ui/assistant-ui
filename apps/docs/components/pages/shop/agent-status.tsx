"use client";

import { useState, type ReactNode } from "react";
import {
  BellIcon,
  BellOffIcon,
  BellRingIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import {
  agentKindName,
  useShippingMethod,
  type ShippingMethod,
} from "@/lib/catalog/shipping-store";
import {
  requestNotifications,
  useNotificationState,
} from "@/lib/checkout/notifications";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { getCatalogItem } from "@/lib/catalog";
import { useWizardNext } from "@/components/pages/shop/wizard-actions";

export const agentPrompt = (url: string, products: readonly string[]) =>
  `Install ${new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(products)}.\nRun \`npx setup-agent ${url}\` to fetch installation steps.`;

const agentName = (agent: ShippingMethod) =>
  agent.id === "other" ? "your agent" : agent.name;

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

/** The agent's display name: what the CLI reported, else the one the user picked. */
export const useAgentName = (checkout: CheckoutContextValue) => {
  const chosen = useShippingMethod();
  return agentKindName(checkout.state?.agent.kind) ?? agentName(chosen);
};

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
  aside,
}: {
  url: string;
  products: string[];
  aside?: ReactNode;
}) {
  const text = agentPrompt(url, products);
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-foreground/[0.04] dark:bg-foreground/[0.06] w-full rounded-xl px-4 py-3 text-sm leading-6 wrap-anywhere whitespace-pre-wrap">
        {text}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CopyButton text={text} label="Copy prompt" />
        {aside}
      </div>
    </div>
  );
}

function BeginPlanBody({ checkout }: { checkout: CheckoutContextValue }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string>();
  const begin = async () => {
    setStarting(true);
    setError(undefined);
    try {
      await checkout.commands["checkout/begin-plan"]();
    } catch {
      setError("Could not start planning. Please try again.");
    } finally {
      setStarting(false);
    }
  };
  const wizard = useWizardNext({
    label: "Next",
    disabled: starting || checkout.degraded,
    onClick: () => void begin(),
  });
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Follow your agent’s progress, answer questions, and steer it here. Begin
        when you’re ready. Your agent will inspect your project and propose a
        plan for you to approve.
      </p>
      {wizard ? null : (
        <Button
          disabled={starting || checkout.degraded}
          onClick={() => void begin()}
        >
          {starting ? (
            <LoaderCircleIcon
              className="size-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : null}
          {starting ? "Starting…" : "Begin plan"}
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NotifyButton() {
  const permission = useNotificationState();
  if (permission === "unsupported") return null;
  if (permission === "granted") {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <BellRingIcon className="size-3.5" />
        We will notify you when your agent needs you.
      </p>
    );
  }
  if (permission === "denied") {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <BellOffIcon className="size-3.5" />
        Notifications are blocked for this site in your browser.
      </p>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void requestNotifications()}
    >
      <BellIcon data-icon="inline-start" />
      Notify me when it needs me
    </Button>
  );
}

const WORKS_WITH = ["claude", "codex", "cursor", "gemini", "opencode"] as const;

function WorksWith() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span>Works with</span>
      <ul className="flex items-center gap-3">
        {WORKS_WITH.map((kind) => (
          <li key={kind} className="flex" title={agentKindName(kind)}>
            <AgentKindIcon kind={kind} className="size-4" />
            <span className="sr-only">{agentKindName(kind)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConnectBody({ url, products }: { url: string; products: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Paste this prompt into your coding agent. You’ll review a plan before
        anything is installed.
      </p>
      <AgentSnippet url={url} products={products} aside={<WorksWith />} />
      <p
        role="status"
        className="text-muted-foreground flex items-center gap-2 text-sm"
      >
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-4 shrink-0 motion-safe:animate-spin"
        />
        Waiting for connection…
      </p>
    </div>
  );
}

function WaitingBody() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p
        role="status"
        className="text-muted-foreground flex items-center gap-2 text-base sm:text-sm"
      >
        <LoaderCircleIcon
          aria-hidden="true"
          className="size-4 shrink-0 motion-safe:animate-spin"
        />
        Agent detected. Connecting…
      </p>
      <NotifyButton />
    </div>
  );
}

function QuietBody({ url, products }: { url: string; products: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Its stream stopped. If it is still working, ask it to run the command
        again and it picks up where it left off.
      </p>
      {open ? (
        <AgentSnippet url={url} products={products} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm"
        >
          Show the prompt
          <ChevronDownIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function StatusDot({ phase }: { phase: AgentPhase }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2",
        "border-background",
        phase === "connected" && "bg-emerald-500",
        phase === "waiting" && "bg-foreground/50 animate-pulse",
        phase === "quiet" && "bg-amber-500",
        phase === "finished" && "bg-foreground",
        (phase === "unconnected" || phase === "stopped") && "bg-foreground/20",
      )}
    />
  );
}

/** The agent's mark with a dot for its connection phase. */
export function AgentAvatar({ checkout }: { checkout: CheckoutContextValue }) {
  const chosen = useShippingMethod();
  return (
    <span className="border-foreground/15 relative flex size-9 shrink-0 items-center justify-center rounded-full border">
      <AgentKindIcon
        kind={checkout.state?.agent.kind ?? chosen.id}
        className="size-4"
      />
      <StatusDot phase={agentPhase(checkout)} />
    </span>
  );
}

export function AgentStatus({
  checkout,
  inline = false,
}: {
  checkout: CheckoutContextValue;
  inline?: boolean;
}) {
  const phase = agentPhase(checkout);
  const name = useAgentName(checkout);
  const { state } = checkout;
  const cwd = state?.agent.cwd ?? null;
  const lastSeen = state?.agent.lastSeenAt ?? null;
  const products = state?.products.length
    ? state.products.map((product) => product.name)
    : checkout.session.products.map(
        (slug) => getCatalogItem(slug)?.name ?? slug,
      );

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
    phase === "unconnected" ? (
      <ConnectBody url={checkout.url} products={products} />
    ) : phase === "waiting" ? (
      <WaitingBody />
    ) : phase === "connected" && state?.status === "waiting" ? (
      <BeginPlanBody checkout={checkout} />
    ) : phase === "quiet" && !checkout.degraded ? (
      <QuietBody url={checkout.url} products={products} />
    ) : null;

  if (inline && body)
    return <section aria-label="Connect agent">{body}</section>;

  return (
    <section
      aria-label="Agent status"
      className={cn(
        "rounded-document border",
        body ? "border-foreground" : "border-foreground/15",
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
