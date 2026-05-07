import { RECIPES } from './recipes.js';
import { PREVIEWS } from './preview-registry.js';
import type { Recipe, RecipeSummary, PreviewMetadata, Capability } from './types.js';

export function listRecipes(filter?: {
  tag?: string;
  capability?: string;
}): RecipeSummary[] {
  let results: Recipe[] = RECIPES;
  if (filter?.tag) results = results.filter((r) => r.tags.includes(filter.tag!));
  if (filter?.capability)
    results = results.filter((r) =>
      r.capabilities.includes(filter.capability as Capability),
    );
  return results.map(({ id, label, capabilities, preview }) => ({
    id,
    label,
    capabilities,
    preview,
  }));
}

export function getRecipe(id: string): Recipe {
  const r = RECIPES.find((recipe) => recipe.id === id);
  if (!r) {
    throw new Error(`Unknown recipe: "${id}". Valid IDs: ${RECIPES.map((recipe) => recipe.id).join(', ')}`);
  }
  return r;
}

export function getPreview(id: string): PreviewMetadata {
  const p = PREVIEWS[id];
  if (!p) throw new Error(`No preview entry for recipe: "${id}"`);
  return p;
}

export { RECIPES } from './recipes.js';
export { PREVIEWS } from './preview-registry.js';
export { ASSISTANT_UI_VERSIONS, REMOVE_PACKAGES } from '../version-maps/assistant-ui.js';
export type {
  Recipe,
  RecipeSummary,
  PreviewMetadata,
  EnvVar,
  RecipeAgentMeta,
  RecipeTech,
  Framework,
  Runtime,
  FrontendPattern,
  PersistenceModel,
  AgentPattern,
  VerifyProfile,
  Capability,
} from './types.js';
export type { UnknownWorkspaceDependencyPolicy } from '../version-maps/assistant-ui.js';
