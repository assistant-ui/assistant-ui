import { RENDERER_PATH } from "./renderer";

export const VARIANTS_DEMO_PATH = "/variants-demo";

/** Pages that only render inside an iframe, so they skip the site's own chrome. */
export const BLOCK_PREVIEW_PATHS: readonly string[] = [
  "/blocks/demos/document-editor",
  "/blocks/demos/primitives-chat",
  "/blocks/demos/base",
];

export const EMBEDDED_PATHS: readonly string[] = [
  RENDERER_PATH,
  VARIANTS_DEMO_PATH,
  ...BLOCK_PREVIEW_PATHS,
];

export function isAssistantHiddenPath(pathname: string): boolean {
  return EMBEDDED_PATHS.includes(pathname);
}
