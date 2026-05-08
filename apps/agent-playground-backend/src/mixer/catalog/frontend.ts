import { getRecipe, listRecipes } from "./index.js";
import type { Capability, Recipe } from "./types.js";

export type FrontendExampleCategory =
  | "Chat"
  | "Agents"
  | "UI Patterns"
  | "Integrations"
  | "Mobile";

export type FrontendExampleComplexity = "starter" | "intermediate" | "advanced";

export interface FrontendExampleSummary {
  id: string;
  label: string;
  teaser: string;
  description: string;
  kind: "template" | "example";
  tags: string[];
  capabilities: Capability[];
  preview: Recipe["preview"];
  tech: Recipe["tech"];
  verifyProfile: Recipe["verifyProfile"];
  sourcePath: string;
  env: Recipe["env"];
  ui: {
    category: FrontendExampleCategory;
    complexity: FrontendExampleComplexity;
    featured: boolean;
  };
}

export interface FrontendExampleDetail extends FrontendExampleSummary {
  env: Recipe["env"];
  agent: Recipe["agent"];
}

const FEATURED_IDS = new Set([
  "next-ai-sdk-v6",
  "next-artifacts",
  "next-react-hook-form",
  "next-langgraph-example",
  "react-router",
  "tanstack",
]);

function createTeaser(description: string): string {
  const firstSentence =
    description.split(". ")[0]?.trim() ?? description.trim();
  if (firstSentence.length <= 72) return firstSentence;
  return `${firstSentence.slice(0, 69).trimEnd()}...`;
}

function deriveCategory(recipe: Recipe): FrontendExampleCategory {
  if (recipe.tags.includes("expo") || recipe.tags.includes("react-native"))
    return "Mobile";
  if (recipe.tech.agentPattern === "langgraph") return "Agents";
  if (
    ["mcp", "cloud", "a2a", "ag-ui", "google-adk"].includes(
      recipe.tech.agentPattern,
    )
  )
    return "Integrations";
  if (
    recipe.capabilities.includes("form-copilot") ||
    recipe.capabilities.includes("artifact-preview") ||
    recipe.capabilities.includes("external-store")
  ) {
    return "UI Patterns";
  }
  return "Chat";
}

function deriveComplexity(recipe: Recipe): FrontendExampleComplexity {
  if (
    recipe.tech.agentPattern === "langgraph" ||
    recipe.tech.agentPattern === "google-adk" ||
    recipe.tech.agentPattern === "mcp" ||
    recipe.capabilities.includes("voice-input") ||
    recipe.capabilities.includes("media-processing") ||
    recipe.capabilities.includes("agent-protocol")
  ) {
    return "advanced";
  }
  if (
    recipe.capabilities.includes("persistent-threads") ||
    recipe.capabilities.includes("custom-backend") ||
    recipe.capabilities.includes("form-copilot") ||
    recipe.capabilities.includes("external-store") ||
    recipe.capabilities.includes("parent-grouping") ||
    recipe.capabilities.includes("thread-list")
  ) {
    return "intermediate";
  }
  return "starter";
}

function toFrontendExampleSummary(recipe: Recipe): FrontendExampleSummary {
  return {
    id: recipe.id,
    label: recipe.label,
    teaser: createTeaser(recipe.description),
    description: recipe.description,
    kind: recipe.kind,
    tags: recipe.tags,
    capabilities: recipe.capabilities,
    preview: recipe.preview,
    tech: recipe.tech,
    verifyProfile: recipe.verifyProfile,
    sourcePath: recipe.sourcePath,
    env: recipe.env,
    ui: {
      category: deriveCategory(recipe),
      complexity: deriveComplexity(recipe),
      featured: FEATURED_IDS.has(recipe.id),
    },
  };
}

export function listFrontendExamples(filter?: {
  kind?: "example" | "template";
  tag?: string;
  capability?: string;
}): FrontendExampleSummary[] {
  const compactList = listRecipes({
    capability: filter?.capability,
    tag: filter?.tag,
  });
  const recipes = compactList.map((item) => getRecipe(item.id));
  const filtered = filter?.kind
    ? recipes.filter((recipe) => recipe.kind === filter.kind)
    : recipes;
  return filtered.map(toFrontendExampleSummary);
}

export function getFrontendExample(id: string): FrontendExampleDetail {
  const recipe = getRecipe(id);
  return {
    ...toFrontendExampleSummary(recipe),
    env: recipe.env,
    agent: recipe.agent,
  };
}
