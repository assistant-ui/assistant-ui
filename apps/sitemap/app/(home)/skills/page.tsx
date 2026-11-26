import type { Metadata } from "next";
import { ArrowUpRightIcon } from "lucide-react";
import { McpIcon } from "@/components/icons/mcp";
import { GlyphAgent, LibraryPageGlyph } from "@/components/library/item-glyph";
import { AgentList } from "@/components/pages/skills/agent-list";
import { AgentPicker } from "@/components/pages/skills/agent-picker";
import { McpPanel } from "@/components/pages/skills/mcp-panel";
import { SkillPicker } from "@/components/pages/skills/skill-picker";
import {
  SkillList,
  SkillsLibrary,
  type SkillRow,
} from "@/components/pages/skills/skill-list";
import { PageFrame } from "@/components/shared/page-frame";
import { OverviewIndex } from "@/components/shared/overview-index";
import { PageHero } from "@/components/shared/page-hero";
import { PageSection } from "@/components/shared/page-section";
import { getSkills } from "@/lib/agent-skills";
import { getLibraryItems } from "@/lib/library/items";

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

  const link = (href: string, label: string) => (
    <a
      href={href}
      className="group/link text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 transition-colors"
    >
      {label}
      <ArrowUpRightIcon
        aria-hidden
        className="size-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 motion-reduce:transition-none"
      />
    </a>
  );

  return (
    <PageFrame pad="sub">
      <SkillsLibrary items={libraryItems}>
        <PageHero
          title="assistant-ui, taught to your coding agent."
          deck="Skills your agent reads before it writes assistant-ui code, an MCP server it can search the live docs with, and the agents both work in."
          primary={{ label: "Read the docs", href: "/docs/llm" }}
          secondary={{ install: INSTALL_ALL }}
          aside={
            <OverviewIndex
              label="On this page"
              items={[
                {
                  name: "Skills",
                  meta: String(skillRows.length),
                  line: "The current APIs, the packages to pick, the migrations.",
                  href: "#skills",
                  icon: <LibraryPageGlyph page="skills" />,
                },
                {
                  name: "MCP",
                  line: "The live docs, searchable while your agent works.",
                  href: "#mcp",
                  icon: <McpIcon className="size-5" />,
                },
                {
                  name: "Agents",
                  meta: String(agents.length),
                  line: "Where the skills install, and the command for each.",
                  href: "#agents",
                  icon: <GlyphAgent />,
                },
              ]}
            />
          }
        />

        <PageSection
          id="skills"
          title="What each skill covers."
          deck={`Instructions your agent reads before it writes code. One command installs all ${skillRows.length}, and you call one by name, such as /setup in Claude Code.`}
          links={link(REPO, "Read the source")}
          panel={<SkillPicker skills={skillRows} />}
        >
          <SkillList skills={skillRows} />
        </PageSection>

        <PageSection
          id="mcp"
          title="The live docs, inside your agent."
          deck="assistant-ui hosts an MCP server with the documentation, examples, and components. There is nothing to install, and it is always current."
          links={link("/docs/llm#mcp", "MCP setup in the docs")}
          panel={<McpPanel />}
        />

        <PageSection
          id="agents"
          title={`Works in ${agents.length} agents.`}
          deck="The install command finds the agents you have. Each one reads skills from its own folder, and its menu copies the command that installs into it alone."
          links={link(AGENTS_DOCS, "The list of supported agents")}
          panel={
            <AgentPicker
              agents={agents}
              skillNames={skillRows.map((row) => row.item.name)}
            />
          }
        >
          <AgentList agents={agents} />
        </PageSection>
      </SkillsLibrary>
    </PageFrame>
  );
}
