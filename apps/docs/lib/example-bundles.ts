import manifest from "../../../scripts/example-bundles.json";

export const EXAMPLE_BUNDLES = manifest;
export type ExampleBundle = (typeof EXAMPLE_BUNDLES)[number];
export const getExampleBundle = (slug: string) =>
  EXAMPLE_BUNDLES.find((example) => example.slug === slug);
export const bundleHref = (slug: string) => `/components/bundles/${slug}`;
export const bundlePreviewHref = (slug: string) =>
  `/example-bundles/${slug}/index.html`;
