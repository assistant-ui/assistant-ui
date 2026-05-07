import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { listRecipes } from "../mixer/catalog/index.js";

describe("assistant-ui catalog extraction", () => {
  it("contains only assistant-ui recipes", () => {
    const recipes = listRecipes();
    assert.ok(recipes.length > 0);
    assert.equal(recipes.some((recipe) => recipe.id.includes("butterbase")), false);
  });

  it("copies scaffold recipe assets into dist for runtime materialization", () => {
    const minimalTemplate = fileURLToPath(new URL("../mixer/assets/recipes/assistant-ui/templates/minimal/package.json", import.meta.url));
    assert.equal(existsSync(minimalTemplate), true);
  });
});
