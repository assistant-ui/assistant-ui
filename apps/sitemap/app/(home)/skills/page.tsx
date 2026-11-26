import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { AgentList } from "@/components/pages/skills/agent-list";
import { CopyCommand } from "@/components/pages/skills/copy-command";
import { McpPanel } from "@/components/pages/skills/mcp-panel";
import {
  SkillList,
  SkillsLibrary,
  type SkillRow,
} from "@/components/pages/skills/skill-list";
import { PageFrame } from "@/components/shared/page-frame";
import { Button } from "@/components/ui/button";
import { typeDeck, typePage, typeSection } from "@/components/shared/type";
import { getSkills } from "@/lib/agent-skills";
import { getLibraryItems } from "@/lib/library/items";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Skills",
  description:
    "The assistant-ui skills for coding agents: what each one covers, the command that installs it, and the agents it installs into.",
};

const REPO = "https://github.com/assistant-ui/skills";
const AGENTS_DOCS =
  "https://github.com/vercel-labs/skills/blob/main/docs/agents.md";
const INSTALL_ALL = "npx skills add assistant-ui/skills";

const skillCommand = (name: string) => `${INSTALL_ALL} --skill ${name}`;

/**
 * A skill's description opens with what it covers, then says when an agent uses it.
 * `lead` is that opening clause, without its lists and asides, for the one-line row.
 */
const firstSentence = (text: string) => text.split(/\.\s/)[0]!;

const lead = (text: string) => {
  const clause = firstSentence(text)
    .split(/:\s/)[0]!
    .replace(/\s*\([^)]*\)/g, "")
    .replaceAll("`", "")
    .trim();
  return clause.endsWith(".") ? clause : `${clause}.`;
};

export default function SkillsPage() {
  const skills = getSkills();
  const libraryItems = getLibraryItems();
  const skillRows: SkillRow[] = skills.flatMap((skill) => {
    const item = libraryItems.find(
      (entry) => entry.id === `skills/${skill.name}`,
    );
    return item
      ? [
          {
            item,
            lead: lead(skill.description),
            command: skillCommand(skill.name),
            content: skill.content.trim(),
          },
        ]
      : [];
  });
  const agents = libraryItems.filter(
    (item) =>
      item.category === "skills" &&
      item.section === "Agents" &&
      item.install?.kind === "command",
  );

  return (
    <PageFrame pad="sub">
      <SkillsLibrary items={libraryItems}>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <header className="max-w-2xl">
            <h1 className={typePage}>
              assistant-ui, taught to your coding agent.
            </h1>
            <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
              Skills are instructions your agent reads before it writes
              assistant-ui code: the current APIs, the packages to pick, and the
              migrations. One command installs all {skills.length}. The MCP
              server lets it look up the live docs while it works.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button nativeButton={false} render={<Link href="/docs/llm" />}>
                Read the docs
              </Button>
              <CopyCommand command={INSTALL_ALL} />
            </div>
          </header>
          <McpPanel />
        </div>

        <section
          id="skills"
          aria-labelledby="skills-heading"
          className="border-foreground/10 mt-16 scroll-mt-24 border-t pt-12 md:mt-20 md:pt-16"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="skills-heading" className={typeSection}>
              What each skill covers.
            </h2>
            <a
              href={REPO}
              className="group/link text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px] transition-colors"
            >
              Read the source
              <ArrowUpRightIcon
                aria-hidden
                className="size-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
              />
            </a>
          </div>
          <SkillList skills={skillRows} />
        </section>

        <section
          id="agents"
          aria-labelledby="agents-heading"
          className="border-foreground/10 mt-16 scroll-mt-24 border-t pt-12 md:mt-20 md:pt-16"
        >
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 id="agents-heading" className={typeSection}>
              Works in {agents.length} agents.
            </h2>
            <p className={cn(typeDeck, "max-w-[52ch]")}>
              The command finds the agents you have. Each one reads skills from
              the folder under its name, and its menu copies the command that
              installs into it alone.
            </p>
            <a
              href={AGENTS_DOCS}
              className="group/link text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-[13px] transition-colors"
            >
              The list of supported agents
              <ArrowUpRightIcon
                aria-hidden
                className="size-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
              />
            </a>
          </div>
          <AgentList agents={agents} />
        </section>
      </SkillsLibrary>
    </PageFrame>
  );
}
