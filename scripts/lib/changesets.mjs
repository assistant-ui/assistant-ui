const BUMP_VALUES = new Set(["patch", "minor", "major"]);
const RELEASE_VALUES = new Set([...BUMP_VALUES, "none"]);

export function parseBumpLine(line) {
  const release = parseReleaseLine(line);
  return release && BUMP_VALUES.has(release.bump) ? release : null;
}

// Mirrors the block-mapping lines that `yaml`, the parser `@changesets/parse`
// uses, accepts for a changeset: a plain key cannot start with a YAML
// indicator (nor with `-` or `?` and a space, which open a sequence entry or a
// complex key), the colon needs a space or tab after it even after a quoted
// key, and only spaces and tabs count as whitespace (`\s` would also admit
// U+00A0, a BOM or U+2028, which `yaml` rejects).
export function parseReleaseLine(line) {
  const entry = line.match(
    /^[ \t]*(?:"([^"]*)"|'([^']*)'|(?![-?][ \t])([^\s#:@`%!&*|>[\]{},'"][^:]*?))[ \t]*:[ \t]+(.*?)\r?$/,
  );
  if (!entry) return null;
  const value = entry[4].match(
    /^(?:"([^"]*)"|'([^']*)'|([^ \t#]*))(?:[ \t]+#.*)?[ \t]*$/,
  );
  if (!value) return null;
  const bump = value[1] ?? value[2] ?? value[3];
  if (!RELEASE_VALUES.has(bump)) return null;
  return { name: entry[1] ?? entry[2] ?? entry[3], bump };
}

// A copy of `mdRegex` from `@changesets/parse`, which `changeset version` uses
// to read a changeset. The checks run in CI without installed dependencies, so
// they cannot import it; keep the two patterns identical.
const CHANGESET_SOURCE = /\s*---([\s\S]*?)\r?\n\s*---(\s*(?:\n|$)[\s\S]*)/;

export function readChangesetSource(source) {
  const match = CHANGESET_SOURCE.exec(source);
  return match ? { frontmatter: match[1], body: match[2] } : null;
}
