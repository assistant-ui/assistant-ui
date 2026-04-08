"use client";

import { useEffect, useRef } from "react";
import { makeAssistantToolUI } from "@assistant-ui/react";
import { useA2ui } from "@assistant-ui/react-a2ui";
import { dismissOtherSurfaces } from "./surface-utils";

type RecipeResult = {
  dish: string;
  ingredients: string[];
  steps: string[];
  time: string;
  servings: string;
};

export const RecipeToolUI = makeAssistantToolUI<{ dish: string }, RecipeResult>(
  {
    toolName: "show_recipe",
    render: ({ result }) => {
      const { processMessage } = useA2ui();
      const created = useRef(false);

      useEffect(() => {
        if (!result || created.current) return;
        created.current = true;

        dismissOtherSurfaces(processMessage, "recipe");
        processMessage({ type: "createSurface", surfaceId: "recipe" });
        processMessage({
          type: "updateComponents",
          surfaceId: "recipe",
          components: [
            {
              type: "Card",
              id: "recipe-card",
              props: {
                title: result.dish,
                subtitle: `${result.time} -- Serves ${result.servings}`,
              },
            },
            {
              type: "Text",
              id: "recipe-ing-title",
              props: { value: "Ingredients" },
            },
            ...result.ingredients.map((ing, i) => ({
              type: "Row",
              id: `ing-${i}`,
              props: { label: ing, detail: "", price: "" },
            })),
            { type: "Divider", id: "recipe-divider" },
            {
              type: "Text",
              id: "recipe-steps-title",
              props: { value: "Steps" },
            },
            ...result.steps.map((step, i) => ({
              type: "Row",
              id: `step-${i}`,
              props: { label: `${i + 1}. ${step}`, detail: "", price: "" },
            })),
          ],
        });
      }, [result, processMessage]);

      if (!result)
        return (
          <p className="text-muted-foreground text-sm">Finding recipe...</p>
        );
      return (
        <p className="text-muted-foreground text-sm">
          Here's the recipe for {result.dish}! Follow along in the sidebar.
        </p>
      );
    },
  },
);
