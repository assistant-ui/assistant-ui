/** A catch-all route param as path segments. Farm passes it joined by "/"; `generateStaticParams` returns arrays. */
export const routeSegments = (
  value: string | readonly string[] | undefined,
): string[] =>
  typeof value === "string"
    ? value.split("/").filter(Boolean)
    : [...(value ?? [])];
