import type { Metadata } from "next";
import { PageFrame } from "@/components/shared/page-frame";
import { createOgMetadata } from "@/lib/og";
import { LibraryRelated } from "@/components/pages/library/library-related";
import { SkillsBrowser } from "@/components/pages/library/skills-browser";
import { SkillsHero } from "@/components/pages/library/skills-hero";
import { LIBRARY_SKILLS } from "@/lib/library/skills-data";
import { MCP_EDITORS } from "@/lib/library/mcp-data";

const title = "Skills";
const description =
  "Instructions a coding agent loads to build with assistant-ui, one skill per part of the library.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function SkillsPage(): React.ReactElement {
  const skills = LIBRARY_SKILLS;

  return (
    <PageFrame pad="sub">
      <SkillsHero count={skills.length} />
      <SkillsBrowser skills={skills} />
      <LibraryRelated
        heading="Goes with"
        href="/library/mcp"
        title="MCP server"
        description={`Gives the agent the live docs, examples, and app templates to look things up in. It sets up in ${MCP_EDITORS.length} editors with one command.`}
      />
    </PageFrame>
  );
}
