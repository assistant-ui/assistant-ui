import { z } from "zod";
import type { VocabularyDefinition } from "./types";

export const formDefinitions = {
  Form: {
    description:
      "Wraps named child controls (Select/Input/Checkbox/RadioGroup/CheckboxGroup/DatePicker with a `name`). Carries `_action`; on submit it fires with every named control's value, keyed by `name`.",
    properties: z.object({
      gap: z
        .number()
        .min(0)
        .max(8)
        .optional()
        .describe(
          "Gap between children in 4px units. 0 to 8 is the supported range.",
        ),
    }),
  },
} satisfies Record<string, VocabularyDefinition>;
