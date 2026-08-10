import { z } from "zod";

export const openuiToolParameters = z.object({
  ui: z
    .string()
    .describe("A complete OpenUI Lang program with Card as its root"),
});

export type OpenUIArgs = z.infer<typeof openuiToolParameters>;

export const openuiToolDescriptions = {
  present: "Render a display-only interface from an OpenUI Lang program.",
  prompt:
    "Render an interactive OpenUI Lang form or choice and wait for the user to submit it.",
} as const;
