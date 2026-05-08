import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { getRecipe, listRecipes } from "../mixer/catalog/index.js";

describe("assistant-ui catalog extraction", () => {
  it("contains only assistant-ui recipes", () => {
    const recipes = listRecipes();
    assert.ok(recipes.length > 0);
    assert.equal(
      recipes.some((recipe) => recipe.id.includes("butterbase")),
      false,
    );
  });

  it("copies scaffold recipe assets into dist for runtime materialization", () => {
    const minimalTemplate = fileURLToPath(
      new URL(
        "../mixer/assets/recipes/assistant-ui/templates/minimal/package.json",
        import.meta.url,
      ),
    );
    assert.equal(existsSync(minimalTemplate), true);
  });

  it("applies hosted preview registry metadata to recipe summaries and details", () => {
    const summary = listRecipes().find(
      (recipe) => recipe.id === "next-artifacts",
    );
    assert.equal(summary?.preview.status, "live");
    assert.equal(summary?.preview.url, "/examples-preview/artifacts");
    assert.equal(
      summary?.preview.screenshot,
      "/screenshot/examples/artifacts.png",
    );

    const detail = getRecipe("next-react-hook-form");
    assert.equal(detail.preview.status, "live");
    assert.equal(detail.preview.url, "/examples-preview/form-demo");
  });
});
