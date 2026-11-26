export const SEARCH_SCOPES = [
  "All",
  "Docs",
  "Elements",
  "Examples",
  "Design",
] as const;

export type SearchScope = (typeof SEARCH_SCOPES)[number];

export type RoutePage = {
  url: string;
  title: string;
  description: string;
};

export function inSearchScope(url: string, scope: SearchScope) {
  if (scope === "All") return true;
  const prefix = `/${scope.toLowerCase()}`;
  return url === prefix || url.startsWith(`${prefix}/`);
}

// Scoped only: a bare "@name" could be a handle.
const NPM_PACKAGE = /^@[a-z0-9][\w.-]*\/[\w.-]+$/;

export function shouldSuggestDocsRoute(query: string, pages: RoutePage[]) {
  const normalized = query.trim().toLowerCase();
  return (
    normalized.length >= 4 &&
    normalized.length <= 120 &&
    !/^https?:\/\//.test(normalized) &&
    !/\b(?:sk[-_]|apikey_)[a-z0-9_-]+/.test(normalized) &&
    // An address could identify someone; a package name such as
    // "@assistant-ui/react-ag-ui" cannot.
    (!normalized.includes("@") || NPM_PACKAGE.test(normalized)) &&
    !pages.some(
      (page) =>
        page.title.toLowerCase() === normalized || page.url === normalized,
    )
  );
}
