import type { Metadata } from "next";
import { ArrowUpRightIcon } from "lucide-react";
import { hasAgentIcon } from "@/components/library/agent-icons";
import { AgentMarquee } from "@/components/pages/skills/agent-marquee";
import { CopyCommand, CopyRow } from "@/components/pages/skills/copy-command";
import { SkillList, type SkillRow } from "@/components/pages/skills/skill-list";
import { PageFrame } from "@/components/shared/page-frame";
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

const agentDirectory = (description: string) =>
  description.replace(/^Installs into /, "").replace(/\.$/, "");

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
      <header className="max-w-2xl">
        <h1 className={typePage}>assistant-ui, taught to your coding agent.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Skills are instructions your agent reads before it writes assistant-ui
          code: the current APIs, the packages to pick, and the migrations. One
          command installs all {skills.length}, and you call one by name, such
          as <span className="font-mono">/setup</span> in Claude Code.
        </p>
      </header>
      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
        <CopyCommand command={INSTALL_ALL} className="flex-none" />
        <div className="min-w-0 flex-1">
          <AgentMarquee
            agents={agents.filter((agent) => hasAgentIcon(agent.id))}
          />
        </div>
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
        <SkillList skills={skillRows} libraryItems={libraryItems} />
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
            The command finds the agents you have. To install into one, copy its
            command; each agent reads skills from the folder beside its name.
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
        <ul className="mt-8 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => {
            const command =
              agent.install?.kind === "command" ? agent.install.command : "";
            return (
              <li key={agent.id}>
                <CopyRow
                  command={command}
                  label={`Copy the command for ${agent.name}: ${command}`}
                >
                  <span className="block truncate text-sm">{agent.name}</span>
                  <span className="text-muted-foreground block truncate font-mono text-xs [font-variant-ligatures:none]">
                    {agentDirectory(agent.description)}
                  </span>
                </CopyRow>
              </li>
            );
          })}
        </ul>
      </section>
    </PageFrame>
  );
}
