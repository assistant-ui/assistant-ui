import { z } from "zod";
import type { VocabularyDefinition } from "./types";

export const listDefinitions = {
  ListView: {
    description:
      "A vertical list container. Wrap `ListViewItem` children as rows.",
    properties: z.object({}),
  },
  ListViewItem: {
    description:
      "A row inside a ListView. Carries `_action` to make the whole row clickable and keyboard-activatable.",
    properties: z.object({}),
  },
} satisfies Record<string, VocabularyDefinition>;
