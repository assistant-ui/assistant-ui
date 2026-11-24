"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  useAuiState,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  Copy01Icon,
  McpServerIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import data from "../data.json";
import { FORMATS, type Format } from "./config";
import {
  BLANK,
  connectorTitle,
  merge,
  modelName,
  skillTitle,
  toolTitle,
  useAgent,
  type Agent,
  type AgentChange,
} from "./store";
import {
  Icon,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  Tip,
  field,
  focusRing,
  rItem,
  rSurface,
  textButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* An agent up close: what it runs on, what it can reach, and what it is told */
/* -------------------------------------------------------------------------- */

const EFFORT = { low: "Low", medium: "Medium", high: "High" } as const;

/* Roughly how many lines the instructions take at the card's widest. */
const lines = (text: string) =>
  text
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 96)), 0);

const CLAMP = 7;

export function AgentCard({
  agent,
  writing = false,
}: {
  agent: Agent;
  /** The model is still writing the agent, so there is nothing to copy yet. */
  writing?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const long = lines(agent.system) > CLAMP;

  return (
    <section
      aria-label={agent.name || "New agent"}
      className={cn(rSurface, "border-border/60 flex w-full flex-col border")}
    >
      <div className="flex items-start gap-2 px-4 pt-3.5 pb-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-base leading-6 font-medium wrap-break-word">
            {agent.name || "New agent"}
          </h2>
          <p className="text-muted-foreground leading-[1.375rem] wrap-break-word">
            {agent.description}
          </p>
        </div>
        {!writing && <CopyConfig agent={agent} />}
      </div>

      <AgentFacts agent={agent} className="px-4 pb-4" />

      <div className="border-border/60 flex flex-col items-start gap-2 border-t px-4 pt-3 pb-3.5">
        <h3 className="text-muted-foreground">Instructions</h3>
        <p
          className={cn(
            "w-full leading-[1.375rem] wrap-break-word whitespace-pre-wrap",
            long && !open && "line-clamp-[7]",
          )}
        >
          {agent.system}
        </p>
        {long && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn(
              rItem,
              "text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none",
              focusRing,
            )}
          >
            {open ? "Show less" : "Show all"}
          </button>
        )}
      </div>
    </section>
  );
}

/** The agent's settings as a list: the same rows on the card and in a template. */
export function AgentFacts({
  agent,
  className,
}: {
  agent: Agent;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-y-2",
        className,
      )}
    >
      <Row term="Model">
        {modelName(agent.model)}
        {agent.effort && <Aside>{EFFORT[agent.effort]} effort</Aside>}
      </Row>
      <Row term="Connectors">
        <Badges>
          {agent.connectors.map((name) => (
            <Connector key={name} name={name} />
          ))}
        </Badges>
      </Row>
      <Row term="Tools">
        <Badges>
          {[
            ...agent.tools.map(toolTitle),
            ...(agent.workflows ? ["Workflows"] : []),
          ].map((title) => (
            <Badge key={title}>{title}</Badge>
          ))}
        </Badges>
      </Row>
      <Row term="Skills">
        <Badges>
          {agent.skills.map((id) => (
            <Badge key={id}>{skillTitle(id)}</Badge>
          ))}
        </Badges>
      </Row>
      <Row term="Schedule">
        {agent.schedule ? (
          <>
            {agent.schedule.label}
            <Aside>{agent.schedule.timezone.replaceAll("_", " ")}</Aside>
          </>
        ) : (
          <span className="text-muted-foreground">Runs on request</span>
        )}
      </Row>
    </dl>
  );
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function Aside({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground"> · {children}</span>;
}

const badge =
  "border-border/60 flex h-6 items-center gap-1 rounded-full border px-2 text-[0.8125rem] [&_svg]:size-3.5";

function Badges({ children }: { children: ReactNode[] }) {
  if (children.length === 0)
    return <span className="text-muted-foreground">None</span>;
  return <ul className="flex flex-wrap gap-1.5">{children}</ul>;
}

function Badge({ children }: { children: ReactNode }) {
  return <li className={badge}>{children}</li>;
}

/* A connector is an MCP server, and its badge names the address it is reached at. */
function Connector({ name }: { name: string }) {
  const url = data.connectors.find((entry) => entry.name === name)?.url;
  const content = (
    <span tabIndex={0} className={cn(badge, focusRing)}>
      <Icon icon={McpServerIcon} className="text-muted-foreground" />
      {connectorTitle(name)}
    </span>
  );

  return <li>{url ? <Tip label={url}>{content}</Tip> : content}</li>;
}

/** Copies the agent as a create call, in the form picked from the menu. */
export function CopyConfig({ agent }: { agent: Agent }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Menu>
      <MenuTrigger className={cn(textButton, field, "shrink-0 gap-1.5")}>
        <Icon
          icon={copied ? Tick02Icon : Copy01Icon}
          className="size-3.5 shrink-0"
        />
        <span aria-live="polite">{copied ? "Copied" : "Copy config"}</span>
      </MenuTrigger>
      <MenuPopup align="end">
        {FORMATS.map((format) => (
          <MenuItem
            key={format.id}
            onClick={() => copy(agent, format.id, () => setCopied(true))}
          >
            {format.label}
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
}

export function copy(agent: Agent, id: Format, done: () => void) {
  const format = FORMATS.find((entry) => entry.id === id) ?? FORMATS[0];
  // A page that is not allowed the clipboard copies nothing, and the button stays as it was.
  void navigator.clipboard.writeText(format.write(agent)).then(done, () => {});
}

/* -------------------------------------------------------------------------- */
/* What a tool call leaves in the chat: a line, and the agent under the       */
/* newest one                                                                 */
/* -------------------------------------------------------------------------- */

type Message = { parts: readonly { type: string; toolCallId?: string }[] };

/** The id of the newest tool call in a chat, or an empty string. */
export function newestToolCall(messages: readonly Message[]) {
  const ids = messages.flatMap((message) =>
    message.parts.flatMap((part) =>
      part.type === "tool-call" && part.toolCallId ? [part.toolCallId] : [],
    ),
  );
  return ids.at(-1) ?? "";
}

const text = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const list = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;

/* A tool call's arguments arrive a piece at a time, so each is checked. */
function partial(args: Partial<Record<keyof Agent, unknown>>): AgentChange {
  return {
    name: text(args.name),
    description: text(args.description),
    model: text(args.model),
    system: text(args.system),
    connectors: list(args.connectors),
    tools: list(args.tools),
    skills: list(args.skills),
  };
}

const WORDS: Record<string, string> = {
  system: "instructions",
};

const and = new Intl.ListFormat("en", { type: "conjunction" });

type Receipt = { ok: boolean; name: string; changed: readonly string[] };

function said(toolName: string, receipt: Receipt) {
  if (toolName === "create_agent") return `Created ${receipt.name}`;
  if (receipt.changed.length === 0) return "Nothing changed";
  return `Changed the ${and.format(receipt.changed.map((key) => WORDS[key] ?? key))}`;
}

export function AgentReceipt({
  toolName,
  toolCallId,
  args,
  result,
}: ToolCallMessagePartProps) {
  const agent = useAgent();
  const newest = useAuiState(
    (s) => newestToolCall(s.thread.messages) === toolCallId,
  );
  const receipt = result as Receipt | undefined;

  if (!receipt) {
    const from = toolName === "create_agent" ? BLANK : (agent ?? BLANK);
    return (
      <>
        <p
          role="status"
          className="text-muted-foreground animate-pulse motion-reduce:animate-none"
        >
          Writing the agent
        </p>
        <AgentCard agent={merge(from, partial(args))} writing />
      </>
    );
  }

  if (!receipt.ok)
    return (
      <p className="text-muted-foreground">There is no agent to change yet</p>
    );

  return (
    <>
      <p className="text-muted-foreground flex items-center gap-1.5">
        <Icon icon={Tick02Icon} className="size-4 shrink-0" />
        {said(toolName, receipt)}
      </p>
      {newest && agent && <AgentCard agent={agent} />}
    </>
  );
}
