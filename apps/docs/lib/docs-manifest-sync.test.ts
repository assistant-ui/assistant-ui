import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

const read = (relative: string) =>
  readFileSync(path.join(ROOT, relative), "utf8");

const manifest = (pkg: string) =>
  JSON.parse(read(`packages/${pkg}/package.json`)) as {
    version: string;
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

const publishedRange = (range: string | undefined, workspaceDir: string) =>
  range === "workspace:^" ? `^${manifest(workspaceDir).version}` : range;

const caretLine = (range: string | undefined) => {
  const match = /^\^(\d+)\.(\d+)\.\d+$/.exec(range ?? "");
  if (!match) throw new Error(`expected a caret range, got ${range}`);
  return { major: match[1]!, minor: `${match[1]}.${match[2]}` };
};

describe("docs pages state the versions the manifests declare", () => {
  it("names the assistant-cloud line that core and the platform packages depend on", () => {
    const page = read(
      "apps/docs/content/docs/cloud/(integrations)/upgrade-from-0-1.mdx",
    );
    for (const pkg of ["core", "react", "react-native", "react-ink"]) {
      const { minor } = caretLine(
        publishedRange(
          manifest(pkg).dependencies?.["assistant-cloud"],
          "cloud",
        ),
      );
      expect(page).toContain(`depend on \`assistant-cloud\` ${minor}.`);
    }
  });

  it("gives the ai range @assistant-ui/ai-sdk peers on", () => {
    const range = manifest("ai-sdk").peerDependencies?.ai;
    const { major } = caretLine(range);
    const page = read("apps/docs/content/docs/runtimes/ai-sdk/overview.mdx");
    expect(page).toContain(
      `\`@assistant-ui/ai-sdk\` targets AI SDK v${major} and needs \`ai@${range}\`.`,
    );
  });
});

describe("guides/index.mdx", () => {
  it("links every guide guides/meta.json lists", () => {
    const { pages } = JSON.parse(
      read("apps/docs/content/docs/guides/meta.json"),
    ) as { pages: string[] };
    const index = read("apps/docs/content/docs/guides/index.mdx");
    const unlinked = pages
      .filter((page) => page !== "index" && !page.startsWith("---"))
      .filter((page) => !index.includes(`href="/docs/guides/${page}"`));
    expect(unlinked).toEqual([]);
  });
});

describe("runtimes/ai-sdk/v7.mdx", () => {
  it("states the ai floor @assistant-ui/react-ai-sdk peers on", () => {
    const range = manifest("react-ai-sdk").peerDependencies?.ai;
    caretLine(range);
    const page = read("apps/docs/content/docs/runtimes/ai-sdk/v7.mdx");
    expect(page).toContain(`requires \`ai@${range}\``);
  });
});
