"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CheckIcon,
  CopyIcon,
  Loader2,
  Terminal as TerminalIcon,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Tool configurations ────────────────────────────────────────────────────

const TOOL_CONFIGS = [
  {
    id: "plan" as const,
    label: "Plan",
    pkg: "@tool-ui/plan",
    component: "Plan",
    toolName: "create_plan",
    install: {
      toolAgent: `npx tool-agent "integrate the plan component to track AI task progress"`,
      shadcn: "npx shadcn@latest add @tool-ui/plan",
    },
  },
  {
    id: "terminal" as const,
    label: "Terminal",
    pkg: "@tool-ui/terminal",
    component: "Terminal",
    toolName: "run_command",
    install: {
      toolAgent: `npx tool-agent "integrate the terminal component to show command output"`,
      shadcn: "npx shadcn@latest add @tool-ui/terminal",
    },
  },
  {
    id: "stats" as const,
    label: "Stats",
    pkg: "@tool-ui/stats",
    component: "StatsDisplay",
    toolName: "get_metrics",
    install: {
      toolAgent: `npx tool-agent "integrate the stats display component to show metrics"`,
      shadcn: "npx shadcn@latest add @tool-ui/stats",
    },
  },
];

type ToolId = (typeof TOOL_CONFIGS)[number]["id"];

// ── Syntax-highlighted code block ─────────────────────────────────────────

function CodeBlock({ tool }: { tool: (typeof TOOL_CONFIGS)[number] }) {
  return (
    <div className="h-full font-mono text-[13px] leading-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={tool.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="p-6"
        >
          {/* import makeAssistantToolUI */}
          <div>
            <span className="text-violet-400">import</span>
            <span className="text-zinc-400"> {"{ "}</span>
            <span className="text-sky-300">makeAssistantToolUI</span>
            <span className="text-zinc-400">{" }"}</span>
            <span className="text-violet-400"> from </span>
            <span className="text-emerald-400">"@assistant-ui/react"</span>
            <span className="text-zinc-400">;</span>
          </div>
          {/* import tool component */}
          <div>
            <span className="text-violet-400">import</span>
            <span className="text-zinc-400"> {"{ "}</span>
            <span className="text-sky-300">{tool.component}</span>
            <span className="text-zinc-400">{" }"}</span>
            <span className="text-violet-400"> from </span>
            <span className="text-emerald-400">"{tool.pkg}"</span>
            <span className="text-zinc-400">;</span>
          </div>

          <div className="mt-4">
            <span className="text-sky-300">makeAssistantToolUI</span>
            <span className="text-zinc-400">{"({"}</span>
          </div>
          <div className="pl-4">
            <span className="text-amber-300">toolName</span>
            <span className="text-zinc-400">: </span>
            <span className="text-emerald-400">"{tool.toolName}"</span>
            <span className="text-zinc-400">,</span>
          </div>
          <div className="pl-4">
            <span className="text-amber-300">render</span>
            <span className="text-zinc-400">{": ({ "}</span>
            <span className="text-orange-300">args</span>
            <span className="text-zinc-400">{" }) => ("}</span>
          </div>
          <div className="pl-8">
            <span className="text-rose-400">{"<"}</span>
            <span className="text-sky-300">{tool.component}</span>
            <span className="text-zinc-300"> </span>
            <span className="text-amber-300">{"{"}</span>
            <span className="text-orange-300">...args</span>
            <span className="text-amber-300">{"}"}</span>
            <span className="text-rose-400">{" />"}</span>
          </div>
          <div className="pl-4">
            <span className="text-zinc-400">{"),"}</span>
          </div>
          <div>
            <span className="text-zinc-400">{"});"}</span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Install panel ─────────────────────────────────────────────────────────

type InstallTab = "toolAgent" | "shadcn";

function InstallPanel({ tool }: { tool: (typeof TOOL_CONFIGS)[number] }) {
  const [tab, setTab] = useState<InstallTab>("toolAgent");
  const [copied, setCopied] = useState(false);

  const command =
    tab === "toolAgent" ? tool.install.toolAgent : tool.install.shadcn;

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-zinc-800 border-t px-6 py-4">
      <p className="mb-2.5 font-medium text-xs text-zinc-500">Install</p>
      {/* Tab row */}
      <div className="mb-3 flex gap-0">
        {(["toolAgent", "shadcn"] as InstallTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 pr-4 pb-1.5 font-medium text-xs transition-colors",
              tab === t
                ? "border-zinc-300 text-zinc-200"
                : "border-transparent text-zinc-600 hover:text-zinc-400",
            )}
          >
            {t === "toolAgent" ? "tool-agent" : "shadcn"}
          </button>
        ))}
      </div>
      {/* Command row */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${tool.id}-${tab}`}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5"
        >
          <code className="truncate font-mono text-xs text-zinc-300">
            {command}
          </code>
          <button
            onClick={copy}
            className="relative ml-1 flex size-5 shrink-0 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-200"
            aria-label="Copy command"
          >
            <CheckIcon
              className={cn(
                "absolute size-3.5 text-emerald-400 transition-all duration-150",
                copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
            />
            <CopyIcon
              className={cn(
                "absolute size-3.5 transition-all duration-150",
                copied ? "scale-50 opacity-0" : "scale-100 opacity-100",
              )}
            />
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Tool previews ─────────────────────────────────────────────────────────

function TodoIcon({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary">
        <Check className="size-3 text-primary-foreground" strokeWidth={3} />
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-primary">
        <Loader2 className="size-3 animate-spin text-primary" />
      </span>
    );
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border" />
  );
}

function PlanPreview() {
  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">Build landing page</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              2 of 4 complete
            </p>
          </div>
          <span className="text-muted-foreground text-xs">50%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 rounded-full bg-primary transition-all duration-700" />
        </div>
      </div>
      <ul className="space-y-2.5 px-5 py-4">
        {[
          { label: "Research competitors", status: "completed" },
          { label: "Design wireframes", status: "in_progress" },
          { label: "Write copy", status: "pending" },
          { label: "Review & launch", status: "pending" },
        ].map((todo) => (
          <li key={todo.label} className="flex items-center gap-3">
            <TodoIcon status={todo.status} />
            <span
              className={cn(
                "text-sm",
                todo.status === "completed" && "text-muted-foreground",
                todo.status === "in_progress" && "font-medium text-foreground",
                todo.status === "pending" && "text-muted-foreground",
              )}
            >
              {todo.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TerminalPreview() {
  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <TerminalIcon className="size-4 shrink-0 text-muted-foreground" />
          <code className="truncate font-mono text-xs">
            <span className="text-muted-foreground">~/project$ </span>
            <span className="text-foreground">npm run build</span>
          </code>
        </div>
        <span className="ml-3 shrink-0 font-mono text-muted-foreground text-xs">
          0
        </span>
      </div>
      <div className="space-y-1.5 p-4 font-mono text-xs">
        <div className="text-muted-foreground">&gt; next build</div>
        {[
          "Compiled successfully in 2.3s",
          "Linting and type checking",
          "Building pages...",
          "Finalizing page optimization",
        ].map((line) => (
          <div key={line} className="flex items-center gap-2">
            <Check className="size-3 shrink-0 text-emerald-500" />
            <span className="text-foreground">{line}</span>
          </div>
        ))}
        <div className="mt-3 border-t pt-3 text-muted-foreground">
          Route (app){" "}
          <span className="text-foreground">│ Size │ First Load JS</span>
        </div>
        <div className="text-emerald-500">● /{"  │ 142 B │ 87.2 kB"}</div>
      </div>
    </div>
  );
}

function StatsPreview() {
  const stats = [
    { label: "Revenue", value: "$48.2k", delta: "+12.3%" },
    { label: "Active Users", value: "12.4k", delta: "+8.7%" },
    { label: "Conversion", value: "3.2%", delta: "+0.4%" },
  ];

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-3.5">
        <p className="font-medium text-sm">Campaign Performance</p>
        <p className="text-muted-foreground text-xs">Last 30 days</p>
      </div>
      <div className="grid grid-cols-3 divide-x">
        {stats.map((stat) => (
          <div key={stat.label} className="px-4 py-5">
            <p className="font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="mt-2 font-light text-2xl tabular-nums tracking-tight">
              {stat.value}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-green-600 text-xs tabular-nums dark:text-green-400">
              {stat.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PREVIEWS: Record<ToolId, React.ReactNode> = {
  plan: <PlanPreview />,
  terminal: <TerminalPreview />,
  stats: <StatsPreview />,
};

// ── Main section ──────────────────────────────────────────────────────────

export function ToolUIShowcase() {
  const [active, setActive] = useState<ToolId>("plan");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ids = TOOL_CONFIGS.map((t) => t.id);
    const timer = setInterval(() => {
      setActive((prev) => {
        const idx = ids.indexOf(prev);
        return ids[(idx + 1) % ids.length];
      });
    }, 3800);
    return () => clearInterval(timer);
  }, [paused]);

  const activeTool = TOOL_CONFIGS.find((t) => t.id === active)!;

  return (
    <section className="flex flex-col gap-8">
      {/* Section header */}
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
          Tool UI
        </p>
        <h2 className="font-medium text-3xl tracking-tight">
          Tool calls → beautiful UI
        </h2>
        <p className="max-w-lg text-muted-foreground">
          25+ production-ready components for plans, terminals, charts, and
          more. Connect in seconds with{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground text-xs">
            makeAssistantToolUI
          </code>
          .
        </p>
      </div>

      {/* Widget */}
      <div
        className="overflow-hidden rounded-2xl border bg-zinc-950"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Tab bar */}
        <div className="flex items-center justify-between border-zinc-800 border-b px-4 py-2.5">
          <div className="flex items-center gap-1">
            {/* Traffic lights */}
            <span className="size-3 rounded-full bg-zinc-700" />
            <span className="size-3 rounded-full bg-zinc-700" />
            <span className="size-3 rounded-full bg-zinc-700" />
            <div className="ml-3 flex gap-1">
              {TOOL_CONFIGS.map((tool) => (
                <button
                  key={tool.id}
                  role="tab"
                  aria-selected={active === tool.id}
                  onClick={() => {
                    setActive(tool.id);
                    setPaused(true);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 font-medium text-xs transition-colors",
                    active === tool.id
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>
          <Link
            href="https://tool-ui.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            tool-ui.com
            <ArrowUpRight className="size-3" />
          </Link>
        </div>

        {/* Split: code | preview */}
        <div className="grid lg:grid-cols-2">
          {/* Code panel */}
          <div className="flex flex-col border-zinc-800 border-b text-zinc-300 lg:border-r lg:border-b-0">
            <CodeBlock tool={activeTool} />
            <InstallPanel tool={activeTool} />
          </div>

          {/* Preview panel */}
          <div className="flex items-center justify-center bg-zinc-900/50 p-6">
            <div className="w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: 0.97, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {PREVIEWS[active]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Progress strip */}
        <div className="flex gap-1 border-zinc-800 border-t px-4 py-2">
          {TOOL_CONFIGS.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                "h-0.5 flex-1 rounded-full transition-colors duration-300",
                active === tool.id ? "bg-zinc-400" : "bg-zinc-700",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
