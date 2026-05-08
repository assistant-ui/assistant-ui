export const EXAMPLE_PREVIEW_SLUGS = [
  "ai-sdk",
  "artifacts",
  "form-demo",
] as const;

export type ExamplePreviewSlug = (typeof EXAMPLE_PREVIEW_SLUGS)[number];

export function isExamplePreviewSlug(
  value: string,
): value is ExamplePreviewSlug {
  return (EXAMPLE_PREVIEW_SLUGS as readonly string[]).includes(value);
}
