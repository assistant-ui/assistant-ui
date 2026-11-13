/** A Next.js-style rewrite: a path pattern, optional header and query conditions, and a destination that reuses their captures. */
export type RewriteRule = {
  source: string;
  destination: string;
  has?: readonly {
    type: "header" | "query";
    key: string;
    value?: string;
  }[];
};

const escape = (literal: string) =>
  literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SEGMENT = /\/:(\w+)(\([^)]*\))?([*+])?/g;

const compileSource = (source: string) => {
  let pattern = "";
  let last = 0;
  for (const match of source.matchAll(SEGMENT)) {
    const [token, name, custom, repeat] = match;
    pattern += escape(source.slice(last, match.index));
    const value = custom ? custom.slice(1, -1) : "[^/]+?";
    const group = `(?<${name}>${repeat ? `${value}(?:/${value})*` : value})`;
    pattern += repeat === "*" ? `(?:/${group})?` : `/${group}`;
    last = match.index + token.length;
  }
  return new RegExp(`^${pattern}${escape(source.slice(last))}$`);
};

const compiled = new WeakMap<RewriteRule, RegExp>();

const conditionsMatch = (
  rule: RewriteRule,
  request: Request,
  url: URL,
  captures: Record<string, string>,
) => {
  for (const condition of rule.has ?? []) {
    const actual =
      condition.type === "header"
        ? request.headers.get(condition.key)
        : url.searchParams.get(condition.key);
    if (actual === null) return false;
    if (condition.value === undefined) continue;
    const match = new RegExp(`^(?:${condition.value})$`).exec(actual);
    if (!match) return false;
    Object.assign(captures, match.groups);
  }
  return true;
};

const interpolate = (destination: string, captures: Record<string, string>) =>
  destination.replace(SEGMENT, (_token, name: string) => {
    const value = captures[name];
    return value ? `/${value}` : "";
  });

/** The destination of the first rule the request meets, with the request's query string kept, as Next.js applied rewrites. */
export function matchRewrite(
  rules: readonly RewriteRule[],
  request: Request,
): string | undefined {
  const url = new URL(request.url);
  for (const rule of rules) {
    let source = compiled.get(rule);
    if (!source) compiled.set(rule, (source = compileSource(rule.source)));
    const match = source.exec(url.pathname);
    if (!match) continue;
    const captures: Record<string, string> = { ...match.groups };
    if (!conditionsMatch(rule, request, url, captures)) continue;
    const destination = interpolate(rule.destination, captures);
    return destination.includes("?") ? destination : destination + url.search;
  }
  return undefined;
}
