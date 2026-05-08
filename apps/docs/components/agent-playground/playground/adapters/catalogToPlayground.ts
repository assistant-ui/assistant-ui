import { getProductConfig } from "@/components/agent-playground/contexts/ProductContext";
import type { FrontendExampleSummary } from "@/components/agent-playground/augment/types";
import type { CodeHandoff, PlaygroundExample, PreviewTarget } from "../types";

const LABEL_OVERRIDES: Partial<Record<string, string>> = {
  "next-artifacts": "Artifacts",
  "next-ai-sdk-v6": "ChatGPT Clone",
  "next-react-hook-form": "Form Co-Pilot",
  "next-langgraph-example": "LangGraph Example",
  "next-cloud-example": "Chat Persistence",
};

const TAG_COLOR_BY_CATEGORY: Record<
  PlaygroundExample["category"],
  PlaygroundExample["accentClassName"]
> = {
  Chat: "bg-sky-400",
  Agents: "bg-violet-400",
  "UI Patterns": "bg-sky-400",
  Integrations: "bg-emerald-400",
  Mobile: "bg-amber-400",
};

function createSourceUrl(sourcePath: string): string {
  const product = getProductConfig();
  return `https://github.com/${product.branding.githubOwner}/${product.branding.githubRepo}/tree/${product.branding.defaultBranch}/${sourcePath}`;
}

function createPreviewTargetFromCatalog(
  example: FrontendExampleSummary,
): PreviewTarget {
  const label = LABEL_OVERRIDES[example.id] ?? example.label;
  const hasPreview =
    example.preview.status !== "missing" && Boolean(example.preview.url);

  return {
    status: hasPreview ? "ready" : "empty",
    source: hasPreview ? "hosted" : "none",
    label: `${label} preview`,
    url: hasPreview ? example.preview.url : undefined,
    hint: hasPreview
      ? `Hosted preview for ${label} is available.`
      : `No hosted preview available for ${label}. Use the installation guide instead.`,
  };
}

export function toPlaygroundExample(
  example: FrontendExampleSummary,
): PlaygroundExample {
  const preview = createPreviewTargetFromCatalog(example);

  return {
    id: example.id,
    label: LABEL_OVERRIDES[example.id] ?? example.label,
    teaser: example.teaser,
    description: example.description,
    tags: example.tags,
    category: example.ui.category,
    complexity: example.ui.complexity,
    featured: example.ui.featured,
    hasPreview: preview.status === "ready",
    previewUrl: preview.url ?? "",
    sourceUrl: createSourceUrl(example.sourcePath),
    accentClassName: TAG_COLOR_BY_CATEGORY[example.ui.category],
  };
}

export function toPlaygroundExamples(
  examples: FrontendExampleSummary[],
): PlaygroundExample[] {
  return examples.map(toPlaygroundExample);
}

export function createPreviewTarget(example: PlaygroundExample): PreviewTarget {
  return {
    status: example.hasPreview ? "ready" : "empty",
    source: example.hasPreview ? "hosted" : "none",
    label: `${example.label} preview`,
    url: example.hasPreview ? example.previewUrl : undefined,
    hint: example.hasPreview
      ? `Hosted preview for ${example.label} is available.`
      : `No hosted preview available for ${example.label}. Use the installation guide instead.`,
    sourceUrl: example.sourceUrl,
  };
}

export function createCodeHandoff(example: PlaygroundExample): CodeHandoff {
  const product = getProductConfig();
  const prefix = `/${product.branding.githubOwner}/${product.branding.githubRepo}/tree/${product.branding.defaultBranch}/`;
  const examplePath = new URL(example.sourceUrl).pathname.replace(prefix, "");
  return {
    status: "ready",
    title: `${example.label} handoff`,
    commands: [
      `git clone ${product.branding.repoUrl}.git ${product.branding.githubRepo}-reference`,
      `cd ${product.branding.githubRepo}-reference/${examplePath}`,
      "npm install",
      "npm run dev",
    ],
    note: "Download will be wired once workspace packaging is available.",
    downloadLabel: "Download zip",
  };
}
