import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { createOgMetadata } from "@/lib/og";
import { LibraryRelated } from "@/components/pages/library/library-related";
import { SkillsBrowser } from "@/components/pages/library/skills-browser";
import { SkillsHeroActions } from "@/components/pages/library/skills-hero-actions";
import { getLibrarySkills } from "@/lib/library/load-skills";
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
  const skills = getLibrarySkills();

  return (
    <PageFrame pad="sub">
      <div className="mb-8 flex flex-col gap-3">
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
          {skills.length} skills a coding agent loads to build with
          assistant-ui, all installed with one command.
        </p>
        <SkillsHeroActions />
      </div>
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
