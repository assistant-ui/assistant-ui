// Next bundles path-to-regexp without declarations. The redirect tests follow
// `next.config` redirects through the same matcher Next itself runs, so they
// use the bundled copy rather than a separately versioned dependency.
declare module "next/dist/compiled/path-to-regexp" {
  export function match(
    path: string,
    options?: { decode?: (value: string) => string },
  ): (
    path: string,
  ) => false | { path: string; params: Record<string, string | string[]> };

  export function compile(
    path: string,
    options?: { validate?: boolean },
  ): (params?: Record<string, string | string[]>) => string;
}
