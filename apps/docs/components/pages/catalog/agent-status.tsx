"use client";

import { useState } from "react";
import {
  BellIcon,
  BellOffIcon,
  BellRingIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentKindIcon } from "@/components/shared/agent-kind-icon";
import type { CheckoutContextValue } from "@/components/shared/checkout-provider";
import {
  SHIPPING_METHODS,
  agentKindName,
  setShippingMethod,
  useShippingMethod,
  type ShippingMethod,
} from "@/lib/catalog/shipping-store";
import {
  requestNotifications,
  useNotificationState,
} from "@/lib/checkout/notifications";
import { markHandedOff, undoHandoff } from "@/lib/checkout/session-store";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

const agentCommand = (url: string) => `npx agent-checkout ${url}`;

/** A `!` in front of a Claude Code message runs it as a shell command. */
const claudeCommand = (url: string) => `! ${agentCommand(url)}`;

const agentPrompt = (url: string) =>
  `Run \`${agentCommand(url)}\` and follow the instructions it prints.`;

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
  const { state, session } = checkout;
  const status = state?.status ?? "waiting";
  if (status === "done") return "finished";
  if (status === "cancelled") return "stopped";
  const everConnected = (state?.agent.lastSeenAt ?? null) !== null;
  if (!everConnected) return session.handedOff ? "waiting" : "unconnected";
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
      variant="ghost"
      size="sm"
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
      {isCopied ? "Copied" : "Copy"}
    </Button>
  );
}

function AgentSnippet({ url, agent }: { url: string; agent: ShippingMethod }) {
  const claude = agent.id === "claude";
  const text = claude ? claudeCommand(url) : agentPrompt(url);
  const hint = claude
    ? "Paste it as a message. The leading ! makes Claude Code run it as a shell command."
    : `Send this as a message to ${agentName(agent)}. It runs the command itself.`;
  return (
    <div>
      <div className="border-foreground/10 bg-muted/40 flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3">
        <code className="min-w-0 flex-1 py-1.5 font-mono text-[13px] leading-relaxed break-all">
          {text}
        </code>
        <CopyButton
          text={text}
          label={claude ? "Copy command" : "Copy prompt"}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-sm">{hint}</p>
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

function ConnectBody({ url }: { url: string }) {
  const agent = useShippingMethod();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Your coding agent does the install on the machine with your project. It
        reads the project first, shows you a plan here, and only starts once you
        approve it.
      </p>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">Coding agent</span>
        <Select
          value={agent.id}
          onValueChange={(id) => {
            if (id !== null) setShippingMethod(id);
          }}
          items={SHIPPING_METHODS.map((method) => ({
            value: method.id,
            label: method.name,
          }))}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue>
              <AgentKindIcon kind={agent.id} className="size-4" />
              {agent.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            {SHIPPING_METHODS.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                <AgentKindIcon kind={method.id} className="size-4" />
                {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <AgentSnippet url={url} agent={agent} />
      <div>
        <Button onClick={markHandedOff}>I have sent it</Button>
      </div>
    </div>
  );
}

function WaitingBody({ introduced }: { introduced: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        It shows up here as soon as it runs the command. You can leave this tab
        in the background.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <NotifyButton />
        {introduced ? null : (
          <button
            type="button"
            onClick={undoHandoff}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            Undo, I have not sent it yet
          </button>
        )}
      </div>
    </div>
  );
}

function QuietBody({ url }: { url: string }) {
  const agent = useShippingMethod();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Its stream stopped. If it is still working, ask it to run the command
        again and it picks up where it left off.
      </p>
      {open ? (
        <AgentSnippet url={url} agent={agent} />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm"
        >
          Show the command
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

export function AgentStatus({ checkout }: { checkout: CheckoutContextValue }) {
  const phase = agentPhase(checkout);
  const name = useAgentName(checkout);
  const { state } = checkout;
  const cwd = state?.agent.cwd ?? null;
  const lastSeen = state?.agent.lastSeenAt ?? null;
  const introduced = (state?.agent.introducedAt ?? null) !== null;
  const chosen = useShippingMethod();
  const kind = state?.agent.kind ?? chosen.id;

  const line = (() => {
    switch (phase) {
      case "unconnected":
        return "Not connected yet";
      case "waiting":
        return "Waiting for it to run the command";
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
      <ConnectBody url={checkout.url} />
    ) : phase === "waiting" ? (
      <WaitingBody introduced={introduced} />
    ) : phase === "quiet" && !checkout.degraded ? (
      <QuietBody url={checkout.url} />
    ) : null;

  return (
    <section
      aria-label="Agent status"
      className={cn(
        "rounded-document border",
        body ? "border-foreground" : "border-foreground/15",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
        <span className="border-foreground/15 relative flex size-9 shrink-0 items-center justify-center rounded-full border">
          <AgentKindIcon kind={kind} className="size-4" />
          <StatusDot phase={phase} />
        </span>
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
