"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { typeDeck, typePage } from "@/components/shared/type";
import {
  SKILL_AGENTS,
  SKILL_AGENTS_DOCS,
  type SkillAgent,
} from "@/lib/library/skill-agents";
import { SKILLS_COMMAND_STEPS } from "@/lib/library/skills-data";
import { cn } from "@/lib/utils";
import { LibraryStepCommand } from "./library-step-command";
import { VisualBackdrop, visualLift } from "./library-visual";
import {
  Menu,
  MenuContent,
  MenuEmpty,
  MenuItem,
  MenuList,
  MenuSearch,
  MenuTrigger,
} from "./menu";

const mono = "font-mono [font-variant-ligatures:none]";

const focus = "focus-visible:ring-ring outline-none focus-visible:ring-2";

const label = "text-xs font-medium";

const AgentIcon = dynamic(() =>
  import("./agent-icons").then((module) => module.AgentIcon),
);

function AgentMark({
  agent,
  className,
}: {
  agent: SkillAgent;
  className?: string;
}) {
  const letter = (
    <span
      aria-hidden
      className={cn(
        "text-muted-foreground grid size-5 place-items-center text-xs font-medium",
        className,
      )}
    >
      {agent.name.charAt(0)}
    </span>
  );
  return (
    <AgentIcon
      slug={agent.slug}
      fallback={letter}
      {...(className && { className })}
    />
  );
}

/** A link on the number of agents, to the list in the skills CLI docs. */
function AgentCount() {
  return (
    <a
      href={SKILL_AGENTS_DOCS}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "text-muted-foreground hover:text-foreground rounded-sm text-xs tabular-nums underline-offset-4 hover:underline",
        focus,
      )}
    >
      {SKILL_AGENTS.length}
      <span className="sr-only">
        {" "}
        agents, listed in the skills CLI docs (opens in a new tab)
      </span>
    </a>
  );
}

const tile =
  "bg-background/90 grid size-10 shrink-0 place-items-center rounded-xl backdrop-blur-md transition-[translate] hover:-translate-y-0.5 motion-reduce:transition-none";

/** Two rows of logo tiles on a colored backdrop; pointing at one names it and its folder below. */
function AgentsTiles() {
  const [slug, setSlug] = useState<string | null>(null);
  const agent = SKILL_AGENTS.find((entry) => entry.slug === slug);
  const rows = [SKILL_AGENTS.slice(0, 7), SKILL_AGENTS.slice(7, 14)];
  return (
    <VisualBackdrop
      tone="mint"
      className="flex h-52 flex-col justify-center gap-2.5 rounded-3xl"
    >
      {rows.map((row, index) => (
        <ul
          key={index}
          className={cn(
            "flex justify-center gap-2.5",
            index === 1 && "translate-x-6",
          )}
        >
          {row.map((entry) => (
            <li
              key={entry.slug}
              tabIndex={0}
              aria-label={`${entry.name}, keeps skills in ${entry.directory}`}
              onPointerEnter={() => setSlug(entry.slug)}
              onFocus={() => setSlug(entry.slug)}
              className={cn(tile, visualLift, focus)}
            >
              <AgentMark agent={entry} />
            </li>
          ))}
        </ul>
      ))}
      <p
        aria-hidden
        className={cn(
          "bg-background/85 text-muted-foreground mx-auto mt-1 flex h-7 max-w-[92%] items-center rounded-full px-3 text-xs backdrop-blur-md",
          visualLift,
        )}
      >
        <span className="truncate">
          {agent ? (
            <>
              <span className="text-foreground font-medium">{agent.name}</span>{" "}
              keeps them in{" "}
              <span className={cn(mono, "text-foreground")}>
                {agent.directory}
              </span>
            </>
          ) : (
            `Available for ${SKILL_AGENTS.length} agents`
          )}
        </span>
      </p>
    </VisualBackdrop>
  );
}

/** A few agents as floating pills, and one pill that opens the rest; an agent picked there moves to the top. */
function AgentsPills() {
  const [slug, setSlug] = useState<string | null>(null);
  const first = SKILL_AGENTS.slice(0, 3);
  const picked = SKILL_AGENTS.find((entry) => entry.slug === slug);
  const shown =
    picked && !first.includes(picked) ? [picked, ...first.slice(0, 2)] : first;
  return (
    <VisualBackdrop
      tone="iris"
      className="flex h-52 flex-col items-center justify-center gap-2 rounded-3xl px-5"
    >
      <ul className="flex w-full flex-col items-center gap-2">
        {shown.map((agent, index) => (
          <li
            key={agent.slug}
            className={cn(
              "bg-background/85 flex h-8 items-center gap-2 rounded-full ps-2 pe-3.5 backdrop-blur-md",
              visualLift,
              ["w-[92%]", "w-[84%]", "w-[76%]"][index],
            )}
          >
            <AgentMark agent={agent} className="size-4" />
            <span className="shrink-0 text-[13px] font-medium">
              {agent.name}
            </span>
            <span
              className={cn(mono, "text-muted-foreground truncate text-xs")}
            >
              {agent.directory}
            </span>
          </li>
        ))}
      </ul>
      <Menu searchable>
        <MenuTrigger
          className={cn(
            "bg-background/85 hover:bg-background h-7 rounded-full px-3 text-xs backdrop-blur-md",
            visualLift,
          )}
        >
          All {SKILL_AGENTS.length} agents
        </MenuTrigger>
        <MenuContent side="bottom" align="center" className="w-60">
          <MenuSearch placeholder="Search agents…" />
          <MenuList className="max-h-56">
            {SKILL_AGENTS.map((agent) => (
              <MenuItem
                key={agent.slug}
                label={agent.name}
                onClick={() => setSlug(agent.slug)}
              >
                <AgentMark agent={agent} className="size-4" />
                {agent.name}
              </MenuItem>
            ))}
            <MenuEmpty>No agent matches.</MenuEmpty>
          </MenuList>
        </MenuContent>
      </Menu>
    </VisualBackdrop>
  );
}

/** Agents as a stack of cards, the way toasts stack; clicking the front one brings up the next. */
function AgentsStack() {
  const [index, setIndex] = useState(0);
  const count = SKILL_AGENTS.length;
  const shown = [0, 1, 2].map((depth) => ({
    agent: SKILL_AGENTS[(index + depth) % count]!,
    depth,
  }));
  return (
    <VisualBackdrop
      tone="dawn"
      className="grid h-52 place-items-center rounded-3xl px-6 pb-4"
    >
      <div className="relative h-14 w-full max-w-xs">
        {shown
          .slice()
          .reverse()
          .map(({ agent, depth }) => (
            <div
              key={agent.slug}
              style={{
                transform: `translateY(${depth * 9}px) scale(${1 - depth * 0.05})`,
                opacity: depth === 2 ? 0.55 : 1,
                zIndex: 3 - depth,
              }}
              className={cn(
                "bg-background absolute inset-0 flex items-center gap-3 rounded-xl ps-2.5 pe-3 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                visualLift,
              )}
            >
              <span className="bg-foreground/[0.04] grid h-9 w-11 shrink-0 place-items-center rounded-lg">
                <AgentMark agent={agent} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium">
                  {agent.name}
                </span>
                <span
                  className={cn(mono, "text-muted-foreground truncate text-xs")}
                >
                  {agent.directory}
                </span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {((index + depth) % count) + 1} of {count}
              </span>
              {depth === 0 ? (
                <button
                  type="button"
                  aria-label={`${agent.name}, keeps skills in ${agent.directory}. Show the next agent.`}
                  onClick={() => setIndex((current) => (current + 1) % count)}
                  className={cn(
                    "absolute inset-0 cursor-pointer rounded-xl",
                    focus,
                  )}
                />
              ) : null}
            </div>
          ))}
      </div>
    </VisualBackdrop>
  );
}

function AgentRow({ agent }: { agent: SkillAgent }) {
  return (
    <li className="flex h-8 items-center gap-2.5 rounded-lg px-1.5">
      <AgentMark agent={agent} className="size-4" />
      <span className="min-w-0 flex-1 truncate text-[13px]">{agent.name}</span>
      <span className={cn(mono, "text-muted-foreground text-xs")}>
        {agent.directory}
      </span>
    </li>
  );
}

/** A sheet of paper on a backdrop, listing every agent and its folder; it scrolls. */
function AgentsSheet() {
  return (
    <VisualBackdrop tone="iris" className="h-52 rounded-3xl px-6 pt-5">
      <div
        className={cn(
          "bg-background flex h-full flex-col gap-1.5 rounded-t-xl p-3",
          visualLift,
        )}
      >
        <div className="flex items-baseline justify-between gap-3 px-1.5">
          <h2 className={label}>Available for these agents</h2>
          <AgentCount />
        </div>
        <ul
          tabIndex={0}
          aria-label="Agents and where each keeps skills"
          className={cn("min-h-0 flex-1 overflow-y-auto rounded-lg", focus)}
        >
          {SKILL_AGENTS.map((agent) => (
            <AgentRow key={agent.slug} agent={agent} />
          ))}
        </ul>
      </div>
    </VisualBackdrop>
  );
}

/** A field to find your agent, with the matches listed above it. */
function AgentsSearch() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = SKILL_AGENTS.filter(
    (agent) =>
      agent.name.toLowerCase().includes(needle) || agent.slug.includes(needle),
  ).slice(0, 4);
  return (
    <VisualBackdrop
      tone="dawn"
      className="flex h-52 flex-col items-center justify-end gap-1.5 rounded-3xl px-6 pb-5"
    >
      <ul
        aria-label="Matching agents"
        aria-live="polite"
        className={cn(
          "bg-background/90 flex w-full max-w-xs flex-col rounded-xl p-1 backdrop-blur-md",
          visualLift,
        )}
      >
        {matches.map((agent) => (
          <AgentRow key={agent.slug} agent={agent} />
        ))}
        {matches.length === 0 ? (
          <li className="text-muted-foreground flex h-8 items-center px-2 text-xs">
            No agent is called that.
          </li>
        ) : null}
      </ul>
      <input
        type="search"
        aria-label="Find your agent"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Find your agent, out of ${SKILL_AGENTS.length}`}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "bg-background placeholder:text-muted-foreground focus-visible:ring-foreground/25 h-9 w-full max-w-xs rounded-xl px-3 text-[13px] outline-none [&::-webkit-search-cancel-button]:appearance-none",
          visualLift,
        )}
      />
    </VisualBackdrop>
  );
}

const VISUALS = [
  { name: "tiles", Visual: AgentsTiles },
  { name: "pills", Visual: AgentsPills },
  { name: "a card stack", Visual: AgentsStack },
  { name: "a list", Visual: AgentsSheet },
  { name: "a search", Visual: AgentsSearch },
];

/** The agents visual as a carousel: one look at a time, with a dot for each. */
function AgentsCarousel() {
  const [index, setIndex] = useState(0);
  const { Visual } = VISUALS[index % VISUALS.length]!;
  return (
    <div className="flex flex-col gap-2.5">
      <div
        key={index}
        className="animate-in fade-in-0 duration-300 motion-reduce:animate-none"
      >
        <Visual />
      </div>
      <div
        role="group"
        aria-label="Ways to see the agents"
        className="flex justify-center gap-1"
      >
        {VISUALS.map((entry, at) => (
          <button
            key={entry.name}
            type="button"
            aria-pressed={at === index}
            aria-label={`Show the agents as ${entry.name}`}
            onClick={() => setIndex(at)}
            className={cn(
              "group/dot grid h-5 cursor-pointer place-items-center rounded-full px-1",
              focus,
            )}
          >
            <span
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none",
                at === index
                  ? "bg-foreground/60 w-4"
                  : "bg-foreground/15 group-hover/dot:bg-foreground/30 w-1.5",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The skills hero: title and description, the install command beside the link
 * to the guide, and the agents the skills install into.
 */
export function SkillsHero({
  count,
}: {
  /** How many skills there are. */
  count: number;
}) {
  return (
    <div className="mb-10 grid grid-cols-[minmax(0,1fr)] items-center gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <div className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link
            href="/library"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Library
          </Link>
        </nav>
        <h1 className={typePage}>Skills</h1>
        <p className={typeDeck}>
          {count} skills a coding agent loads to build with assistant-ui, all
          installed with one command.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <LibraryStepCommand base="npx skills" steps={SKILLS_COMMAND_STEPS} />
          <Link
            href="/docs/llm#skills"
            className={cn(
              "group/cta bg-foreground/[0.06] hover:bg-foreground/[0.1] inline-flex h-9 w-fit items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              focus,
            )}
          >
            Read the skills guide
            <ArrowRightIcon
              aria-hidden
              className="size-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        </div>
      </div>
      <AgentsCarousel />
    </div>
  );
}
