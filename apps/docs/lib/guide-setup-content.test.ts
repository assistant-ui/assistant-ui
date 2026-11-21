import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getCatalogItem } from "@/lib/catalog";

const GUIDES_DIR = path.resolve(__dirname, "../content/docs/guides");

/** Guides whose setup is collapsed behind the Setup section's prompt. */
const SETUP_GUIDES = [
  "attachments",
  "chain-of-thought",
  "latex",
  "mentions",
  "resumable-streams",
  "slash-commands",
  "streamdown",
  "suggestions",
];

const read = (slug: string) =>
  readFileSync(path.join(GUIDES_DIR, `${slug}.mdx`), "utf8");

describe("guide Setup sections", () => {
  it.each(SETUP_GUIDES)(
    "%s has one Setup section with its prompt and collapsed steps",
    (slug) => {
      const source = read(slug);
      expect(getCatalogItem(`guides/${slug}`)?.docs).toBe(
        `/docs/guides/${slug}`,
      );
      expect(source.match(/^## Setup$/gm)).toHaveLength(1);
      expect(source.match(/<AgentSetup /g)).toHaveLength(1);
      expect(source).toContain(
        `## Setup\n\n<AgentSetup product="guides/${slug}" section />\n\n<ManualSteps>\n`,
      );
      expect(source.match(/<ManualSteps>/g)).toHaveLength(1);
      expect(source.match(/<\/ManualSteps>/g)).toHaveLength(1);
      const inside = source.slice(
        source.indexOf("<ManualSteps>"),
        source.indexOf("</ManualSteps>"),
      );
      expect(inside.trim().length).toBeGreaterThan("<ManualSteps>".length);
      expect(inside).not.toMatch(/^## /m);
    },
  );

  it("collapses only setup steps, leaving behavior and reference sections visible", () => {
    const outside = (slug: string, heading: string) => {
      const source = read(slug);
      const at = source.indexOf(heading);
      expect(at).toBeGreaterThan(source.indexOf("</ManualSteps>"));
    };
    outside("resumable-streams", "## Stop and resume in the composer");
    outside("resumable-streams", "## Multiple threads");
    outside("slash-commands", "## `unstable_useSlashCommandAdapter` options");
    outside("slash-commands", "## Controlling the Chip");
    outside("slash-commands", "## Custom Dispatch");
    for (const id of [
      "1-define-commands-with-unstable_useslashcommandadapter",
      "2-controlling-the-chip",
      "3-custom-dispatch",
    ])
      expect(read("slash-commands")).toContain(`<AnchorAlias id="${id}" />`);
  });

  it("keeps the renamed anchors working", () => {
    expect(read("attachments")).toContain(
      '<AnchorAlias id="getting-started" />\n\n## Setup',
    );
    for (const slug of [
      "chain-of-thought",
      "mentions",
      "slash-commands",
      "suggestions",
    ])
      expect(read(slug)).toContain(
        '<AnchorAlias id="quick-start" />\n\n## Setup',
      );
  });

  it("leaves no guide on the old banner where a Setup section exists", () => {
    const withBanner = readdirSync(GUIDES_DIR)
      .filter((file) => file.endsWith(".mdx"))
      .filter((file) =>
        /<AgentSetup product="[^"]+" \/>/.test(
          readFileSync(path.join(GUIDES_DIR, file), "utf8"),
        ),
      );
    expect(withBanner.sort()).toEqual(["dictation.mdx", "speech.mdx"]);
  });
});
