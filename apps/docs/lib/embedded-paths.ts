import { RENDERER_PATH } from "./renderer";

export const VARIANTS_DEMO_PATH = "/variants-demo";

/** Pages that only render inside an iframe, so they skip the site's own chrome. */
export const EMBEDDED_PATHS: readonly string[] = [
  RENDERER_PATH,
  VARIANTS_DEMO_PATH,
];
