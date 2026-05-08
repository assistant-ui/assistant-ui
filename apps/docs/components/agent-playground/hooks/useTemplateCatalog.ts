import { useEffect, useState } from "react";
import { augmentClient } from "@/components/agent-playground/augment/client";
import { useProduct } from "@/components/agent-playground/contexts/ProductContext";
import type { FrontendExampleSummary } from "@/components/agent-playground/augment/types";
import type {
  Category,
  Template,
} from "@/components/agent-playground/lib/templates";

const GRADIENTS = [
  "from-emerald-500/40 via-teal-500/30 to-cyan-400/20",
  "from-orange-500/40 via-rose-500/30 to-amber-400/20",
  "from-cyan-500/40 via-sky-500/30 to-blue-400/20",
  "from-violet-500/40 via-purple-500/30 to-fuchsia-400/20",
  "from-sky-500/40 via-blue-500/30 to-indigo-400/20",
  "from-emerald-400/40 via-green-400/30 to-teal-400/20",
  "from-pink-500/40 via-rose-500/30 to-red-400/20",
  "from-indigo-500/40 via-violet-500/30 to-purple-400/20",
  "from-green-500/40 via-emerald-500/30 to-teal-400/20",
  "from-amber-500/40 via-yellow-500/30 to-orange-400/20",
];

const CATEGORY_DESCRIPTION: Record<string, string> = {
  Chat: "Conversational AI interfaces with streaming responses.",
  Agents: "Autonomous agents that reason, plan, and use tools.",
  "UI Patterns":
    "Common patterns like generative UI, artifacts, and suggestions.",
  Integrations: "Connect to AI providers, databases, and external services.",
  Mobile: "Cross-platform mobile chat interfaces.",
};

function toCategoryId(categoryName: string): string {
  return categoryName.toLowerCase().replace(/\s+/g, "-");
}

export function toTemplate(
  example: FrontendExampleSummary,
  index: number,
): Template {
  const sourcePath = example.sourcePath?.trim();
  const env = example.env ?? [];
  const hasHostedPreview =
    example.preview.status !== "missing" && Boolean(example.preview.url);
  const canStart = Boolean(sourcePath);

  return {
    id: example.id,
    title: example.label,
    description: example.teaser,
    categoryId: toCategoryId(example.ui.category),
    tags: example.tags,
    capabilities: example.capabilities,
    prompt: example.teaser,
    gradient: GRADIENTS[index % GRADIENTS.length] ?? GRADIENTS[0]!,
    kind: example.kind,
    previewStatus: example.preview.status,
    previewBuiltFromRef: example.preview.builtFromRef,
    previewUrl: example.preview.url,
    screenshotUrl: example.preview.screenshot,
    sourcePath: sourcePath || undefined,
    featured: example.ui.featured,
    tech: example.tech,
    verifyProfile: example.verifyProfile,
    env,
    hasHostedPreview,
    hasRequiredEnv: env.some((item) => item.required),
    isEditable: example.kind === "template" && canStart,
    isPreviewOnly: !canStart,
    canStart,
  };
}

export function deriveCategories(
  examples: FrontendExampleSummary[],
): Category[] {
  const seen = new Set<string>();
  const categories: Category[] = [];
  for (const ex of examples) {
    const name = ex.ui.category;
    if (!seen.has(name)) {
      seen.add(name);
      categories.push({
        id: toCategoryId(name),
        name,
        description: CATEGORY_DESCRIPTION[name] ?? "",
      });
    }
  }
  return categories;
}

export interface TemplateCatalogState {
  categories: Category[];
  templates: Template[];
  isLoading: boolean;
  error: string | null;
}

export function useTemplateCatalog(): TemplateCatalogState {
  const product = useProduct();
  const [state, setState] = useState<TemplateCatalogState>({
    categories: [],
    templates: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    void augmentClient
      .listExamples({
        ...product.catalog.filter,
        product: product.id,
      })
      .then((examples) => {
        if (cancelled) return;
        const sorted = [...examples].sort((a, b) => {
          const aHasPreview = Boolean(a.preview.url);
          const bHasPreview = Boolean(b.preview.url);
          if (aHasPreview !== bHasPreview) return aHasPreview ? -1 : 1;
          return Number(b.ui.featured) - Number(a.ui.featured);
        });
        setState({
          categories: deriveCategories(sorted),
          templates: sorted.map(toTemplate),
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Template catalog could not be loaded.";
        setState({
          categories: [],
          templates: [],
          isLoading: false,
          error: message,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [product.catalog.filter, product.id]);

  return state;
}
