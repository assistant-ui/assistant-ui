import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shared/page-frame";
import {
  libraryDeck,
  libraryTitle,
} from "@/components/pages/library/library-item";
import { createOgMetadata } from "@/lib/og";
import { LibraryRelated } from "@/components/pages/library/library-related";
import { McpConnect } from "@/components/pages/library/mcp-connect";
import { McpHeroActions } from "@/components/pages/library/mcp-hero-actions";
import { LIBRARY_SKILLS } from "@/lib/library/skills-data";
import {
  MCP_EDITORS,
  MCP_TOOL_COUNT,
  MCP_TOOL_GROUPS,
} from "@/lib/library/mcp-data";

const title = "MCP server";
const description =
  "The hosted server that gives your editor's agent the assistant-ui docs, examples, and app templates.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

const mono = "font-mono [font-variant-ligatures:none]";

export default function McpPage(): React.ReactElement {
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
        <h1 className={libraryTitle}>MCP server</h1>
        <p className={libraryDeck}>
          One hosted server that gives your editor&apos;s agent the docs,
          examples, and app templates. It sets up in {MCP_EDITORS.length}{" "}
          editors with one command.
        </p>
        <McpHeroActions />
      </div>

      <McpConnect />

      <section aria-labelledby="mcp-tools" className="border-t pt-12 pb-12">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="mcp-tools" className="text-base font-medium">
              Tools
            </h2>
            <p className="text-muted-foreground text-sm">
              What the agent can call once the server is connected.
            </p>
          </div>
          <span className="text-muted-foreground text-sm tabular-nums">
            {MCP_TOOL_COUNT}
          </span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-10 lg:grid-cols-2">
          {MCP_TOOL_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-sm">
                {group.title}. {group.description}
              </h3>
              <ul className="flex flex-col">
                {group.tools.map((tool) => (
                  <li
                    key={tool.name}
                    className="hover:bg-foreground/[0.025] -mx-3 flex flex-col gap-0.5 rounded-xl px-3 py-2.5 transition-colors"
                  >
                    <span className={`${mono} text-[13px]`}>{tool.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {tool.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-8 max-w-[70ch] text-sm">
          Every page is also an MCP resource at{" "}
          <span className={`${mono} text-xs`}>{"assistant-ui://{path}"}</span>,
          and the{" "}
          <span className={`${mono} text-xs`}>
            assistant-ui-template-workflow
          </span>{" "}
          prompt walks an agent through building from a template.
        </p>
      </section>

      <LibraryRelated
        heading="Goes with"
        href="/library#skills"
        title="Skills"
        description={`${LIBRARY_SKILLS.length} skills that teach the agent how to build with assistant-ui. The server is where it looks things up.`}
      />
    </PageFrame>
  );
}
