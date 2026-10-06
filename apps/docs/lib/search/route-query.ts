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

export function shouldSuggestDocsRoute(query: string, pages: RoutePage[]) {
  const normalized = query.trim().toLowerCase();
  return (
    normalized.length >= 4 &&
    normalized.length <= 120 &&
    !/^(?:https?:\/\/|sk_|apikey_)/.test(normalized) &&
    !normalized.includes("@") &&
    !pages.some(
      (page) =>
        page.title.toLowerCase() === normalized || page.url === normalized,
    )
  );
}
