import { INTERNAL_EXAMPLES, type ExampleItem } from "@/lib/examples";
import { examples } from "@/lib/source";
import type {
  XuluxTemplate,
  XuluxTemplateCatalog,
  XuluxTemplateCategory,
} from "@/components/xulux/templates/types";

const CATEGORIES: XuluxTemplateCategory[] = [
  {
    id: "chat",
    name: "Chat",
    description: "Conversational AI interfaces and chat surface patterns.",
  },
  {
    id: "agents",
    name: "Agents",
    description: "Tool-using and workflow-oriented assistant experiences.",
  },
  {
    id: "ui-patterns",
    name: "UI Patterns",
    description: "Artifacts, generative UI, forms, and embedded surfaces.",
  },
  {
    id: "mobile",
    name: "Mobile",
    description: "React Native and mobile-first assistant-ui examples.",
  },
];

// Fumadocs owns the example page content. This file only adds curated UI metadata
// that the docs source does not currently expose, such as category, preview type,
// and template-friendly tech labels.
const PREVIEW_COMPONENT_SLUGS = new Set([
  "ai-sdk",
  "chatgpt",
  "claude",
  "gemini",
  "generative-ui",
  "grok",
  "modal",
  "perplexity",
]);

const TECH_BY_SLUG: Record<string, XuluxTemplate["tech"]> = {
  "ai-sdk": {
    framework: "Next.js",
    runtime: "AI SDK",
    frontendPattern: "Thread + Composer",
  },
  artifacts: {
    framework: "Next.js",
    runtime: "AI SDK",
    frontendPattern: "Artifacts",
  },
  chatgpt: {
    framework: "React",
    runtime: "Local runtime",
    frontendPattern: "Chat clone",
  },
  claude: {
    framework: "React",
    runtime: "Local runtime",
    frontendPattern: "Chat clone",
  },
  expo: {
    framework: "Expo",
    runtime: "React Native",
    frontendPattern: "Mobile chat",
  },
  "form-demo": {
    framework: "Next.js",
    runtime: "AI SDK",
    frontendPattern: "Frontend tools",
  },
  gemini: {
    framework: "React",
    runtime: "Local runtime",
    frontendPattern: "Chat clone",
  },
  "generative-ui": {
    framework: "Next.js",
    runtime: "AI SDK",
    frontendPattern: "Generative UI",
  },
  grok: {
    framework: "React",
    runtime: "Local runtime",
    frontendPattern: "Chat clone",
  },
  mem0: {
    framework: "React",
    runtime: "Mem0",
    frontendPattern: "Memory chat",
  },
  modal: {
    framework: "React",
    runtime: "Local runtime",
    frontendPattern: "Assistant modal",
  },
  perplexity: {
    framework: "React",
    runtime: "Local runtime",
    frontendPattern: "Search chat",
  },
  stockbroker: {
    framework: "React",
    runtime: "LangGraph",
    frontendPattern: "Human-in-the-loop",
  },
};

const GRADIENTS = [
  "from-cyan-500/40 via-sky-500/30 to-blue-400/20",
  "from-emerald-500/40 via-teal-500/30 to-cyan-400/20",
  "from-violet-500/40 via-purple-500/30 to-fuchsia-400/20",
  "from-rose-500/40 via-orange-500/30 to-amber-400/20",
  "from-slate-500/40 via-zinc-500/30 to-neutral-400/20",
];

function slugFromUrl(url: string): string | null {
  const match = /^\/examples\/([^/?#]+)/.exec(url);
  return match?.[1] ?? null;
}

function categoryForSlug(slug: string): XuluxTemplateCategory {
  if (slug === "expo") return CATEGORIES[3]!;
  if (["artifacts", "form-demo", "generative-ui", "modal"].includes(slug)) {
    return CATEGORIES[2]!;
  }
  if (["stockbroker"].includes(slug)) return CATEGORIES[1]!;
  return CATEGORIES[0]!;
}

function tagsForSlug(slug: string, item: ExampleItem): string[] {
  const tags = new Set<string>();
  if (slug.includes("ai-sdk")) tags.add("AI SDK");
  if (slug.includes("langgraph") || slug === "stockbroker")
    tags.add("LangGraph");
  if (slug === "expo") tags.add("React Native");
  if (slug === "artifacts") tags.add("Artifacts");
  if (slug === "form-demo") tags.add("Forms");
  if (slug === "generative-ui") tags.add("Generative UI");
  if (slug === "modal") tags.add("Modal");
  if (item.title.toLowerCase().includes("clone")) tags.add("Clone");
  tags.add("Example");
  return [...tags];
}

function sourcePathFromGithubLink(
  githubLink: string | undefined,
): string | undefined {
  if (!githubLink) return undefined;
  const marker = "/assistant-ui/assistant-ui/";
  const index = githubLink.indexOf(marker);
  if (index === -1) return githubLink;
  const repoPath = githubLink.slice(index + marker.length);
  return repoPath.replace(/^blob\/main\//, "").replace(/^tree\/main\//, "");
}

function getExamplePageData(slug: string) {
  return examples.getPage([slug]);
}

export function getXuluxExamplePreview(slug: string) {
  const item = INTERNAL_EXAMPLES.find(
    (example) => slugFromUrl(example.link) === slug,
  );
  if (!item) return null;
  return {
    slug,
    title: item.title,
    description: item.description,
    screenshotUrl: item.image,
    hasComponentPreview: PREVIEW_COMPONENT_SLUGS.has(slug),
  };
}

export function getXuluxExamplesCatalog(): XuluxTemplateCatalog {
  const templates = INTERNAL_EXAMPLES.flatMap<XuluxTemplate>((item, index) => {
    if (item.external) return [];
    const slug = slugFromUrl(item.link);
    if (!slug) return [];
    const page = getExamplePageData(slug);
    if (!page) return [];

    const category = categoryForSlug(slug);
    const hasComponentPreview = PREVIEW_COMPONENT_SLUGS.has(slug);
    return {
      id: slug,
      title: page.data.title ?? item.title,
      description: page.data.description ?? item.description ?? item.title,
      categoryId: category.id,
      categoryName: category.name,
      tags: tagsForSlug(slug, item),
      prompt: `Use the ${page.data.title ?? item.title} example as the starting point and help me adapt it.`,
      gradient: GRADIENTS[index % GRADIENTS.length]!,
      kind: "example",
      previewStatus: hasComponentPreview ? "live" : "stale",
      previewUrl: `/xulux-preview/${slug}`,
      screenshotUrl: item.image,
      sourcePath: sourcePathFromGithubLink(item.githubLink),
      docsUrl: page.url,
      featured: index < 6,
      tech: TECH_BY_SLUG[slug] ?? {
        framework: "React",
        runtime: "assistant-ui",
        frontendPattern: "Example",
      },
      env: [],
      canStart: true,
    };
  });

  return {
    categories: CATEGORIES,
    templates,
  };
}
