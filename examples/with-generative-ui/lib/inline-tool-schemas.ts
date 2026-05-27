import { z } from "zod/v4";

export const generateChartArgsSchema = z.object({
  title: z.string().describe("Chart title"),
  type: z.enum(["bar", "line", "pie"]).describe("Chart type to render"),
  data: z
    .array(z.record(z.string(), z.union([z.string(), z.number()])))
    .describe("Array of data objects, e.g. [{month: 'Jan', revenue: 100}]"),
  xKey: z
    .string()
    .describe("Key in each data object to use for the x-axis/labels"),
  dataKeys: z
    .array(z.string())
    .describe("Keys in each data object to chart as series/values"),
});

export const showLocationArgsSchema = z.object({
  name: z.string().describe("Name of the place"),
  address: z.string().optional().describe("Street address"),
  lat: z.number().describe("Latitude"),
  lng: z.number().describe("Longitude"),
});

export const selectDateArgsSchema = z.object({
  prompt: z.string().describe("Message to display to the user"),
  minDate: z.string().optional().describe("Minimum date (ISO string)"),
  maxDate: z.string().optional().describe("Maximum date (ISO string)"),
});

export const collectContactArgsSchema = z.object({
  prompt: z.string().describe("Message to display to the user"),
  fields: z
    .array(z.enum(["name", "email", "phone"]))
    .describe("Which fields to collect"),
});

/** Schemas for inline tool UIs — shared with leak detection and tool registration. */
export const inlineToolArgSchemas = [
  generateChartArgsSchema,
  showLocationArgsSchema,
  selectDateArgsSchema,
  collectContactArgsSchema,
] as const;

export type GenerateChartArgs = z.infer<typeof generateChartArgsSchema>;
export type ShowLocationArgs = z.infer<typeof showLocationArgsSchema>;
export type SelectDateArgs = z.infer<typeof selectDateArgsSchema>;
export type CollectContactArgs = z.infer<typeof collectContactArgsSchema>;
