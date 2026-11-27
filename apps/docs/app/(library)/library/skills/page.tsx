import type { Metadata } from "next";
import { Variant, Variants } from "@assistant-ui/variants";
import { PageFrame } from "@/components/shared/page-frame";
import { createOgMetadata } from "@/lib/og";
import { LibraryRelated } from "@/components/pages/library/library-related";
import { LibraryRelatedVisual } from "@/components/pages/library/library-related-visual";
import { SkillsBrowser } from "@/components/pages/library/skills-browser";
import {
  SkillsHeroCommand,
  SkillsHeroComposer,
  SkillsHeroDocument,
  SkillsHeroMatch,
  SkillsHeroMiniStack,
  SkillsHeroMiniTiles,
  SkillsHeroPills,
  SkillsHeroSlash,
  SkillsHeroSources,
  SkillsHeroStack,
  SkillsHeroTiles,
} from "@/components/pages/library/skills-hero-variants";
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
  const mcpLine = `Gives the agent the live docs, examples, and app templates to look things up in. It sets up in ${MCP_EDITORS.length} editors with one command.`;

  return (
    <PageFrame pad="sub">
      <Variants id="library-skills-hero" label="Skills hero" default="pills">
        <Variant id="pills" label="Skill pills">
          <SkillsHeroPills skills={skills} tone="iris" />
        </Variant>
        <Variant id="tiles" label="Glyph tiles">
          <SkillsHeroTiles skills={skills} />
        </Variant>
        <Variant id="stack" label="Card stack">
          <SkillsHeroStack skills={skills} />
        </Variant>
        <Variant id="document" label="Skill file preview">
          <SkillsHeroDocument skills={skills} />
        </Variant>
        <Variant id="command" label="Command as the visual">
          <SkillsHeroCommand skills={skills} />
        </Variant>
        <Variant id="slash" label="Slash command demo">
          <SkillsHeroSlash skills={skills} />
        </Variant>
        <Variant id="match" label="Task to skill demo">
          <SkillsHeroMatch skills={skills} />
        </Variant>
        <Variant id="composer" label="Composer with slash menu">
          <SkillsHeroComposer skills={skills} />
        </Variant>
        <Variant id="mini-stack" label="Compact: card stack">
          <SkillsHeroMiniStack skills={skills} />
        </Variant>
        <Variant id="mini-tiles" label="Compact: tiles and command">
          <SkillsHeroMiniTiles skills={skills} />
        </Variant>
        <Variant id="sources" label="Address bar with live preview">
          <SkillsHeroSources skills={skills} />
        </Variant>
      </Variants>
      <SkillsBrowser skills={skills} />
      <Variants
        id="library-related-link"
        label="Link to MCP at the foot"
        default="current"
      >
        <Variant id="current" label="Current, text only">
          <LibraryRelated
            heading="Goes with"
            href="/library/mcp"
            title="MCP server"
            description={mcpLine}
          />
        </Variant>
        <Variant id="visual" label="With a visual">
          <LibraryRelatedVisual
            heading="Goes with"
            href="/library/mcp"
            title="MCP server"
            description={mcpLine}
            tone="iris"
            labels={MCP_EDITORS.slice(0, 3).map((editor) => editor.label)}
          />
        </Variant>
      </Variants>
    </PageFrame>
  );
}
