import type { Plugin } from "vite";

/**
 * MDX imports that cannot run outside Next (RSC-only `.server` modules and
 * anything listed below) are rewritten to placeholder components. Everything
 * else an MDX page imports is bundled for real.
 */
export const STUBBED_IMPORTS: RegExp[] = [
  /\.server$/,
  ...(process.env.SPIKE_EXTRA_STUBS ?? "")
    .split(",")
    .filter(Boolean)
    .map((s) => new RegExp(s)),
];

const VIRTUAL = "\0spike-stub:";
const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?[ \t]*$/gm;

function parseClause(clause: string) {
  const names: string[] = [];
  let def: string | undefined;
  let ns: string | undefined;
  const braces = clause.match(/\{([\s\S]*)\}/);
  if (braces)
    for (const part of braces[1]!.split(",")) {
      const p = part.trim().replace(/^type\s+/, "");
      if (!p) continue;
      names.push(p.split(/\s+as\s+/)[0]!.trim());
    }
  const rest = clause
    .replace(/\{[\s\S]*\}/, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const r of rest) {
    const m = r.match(/^\*\s+as\s+(\w+)/);
    if (m) ns = m[1];
    else def = r;
  }
  return { names, def, ns };
}

export const stubbed = new Map<string, number>();

export function stubPlugin(): Plugin {
  return {
    name: "spike-stub-mdx-imports",
    enforce: "pre",
    transform: {
      filter: { id: /\.mdx(\?|$)/ },
      handler(code, id) {
        let fence = false;
        const out = code.split("\n").map((line) => line); // keep positions
        void out;
        // Only rewrite import lines outside code fences.
        const lines = code.split("\n");
        let changed = false;
        for (let i = 0; i < lines.length; i++) {
          if (/^\s*(```|~~~)/.test(lines[i]!)) fence = !fence;
          if (fence || !lines[i]!.startsWith("import ")) continue;
          // gather a multi-line import
          let j = i;
          let stmt = lines[i]!;
          while (
            !/from\s+["'][^"']+["'];?\s*$/.test(stmt) &&
            j + 1 < lines.length
          )
            stmt += "\n" + lines[++j];
          IMPORT_RE.lastIndex = 0;
          const m = IMPORT_RE.exec(stmt);
          if (!m) continue;
          const spec = m[2]!;
          if (!STUBBED_IMPORTS.some((r) => r.test(spec))) continue;
          const { names, def, ns } = parseClause(m[1]!);
          const q = encodeURIComponent(
            JSON.stringify({ names, def: !!def, spec }),
          );
          lines[i] = `import ${m[1]} from "${VIRTUAL}${q}";`;
          for (let k = i + 1; k <= j; k++) lines[k] = "";
          stubbed.set(spec, (stubbed.get(spec) ?? 0) + 1);
          changed = true;
          void ns;
          i = j;
        }
        void id;
        return changed ? { code: lines.join("\n"), map: null } : null;
      },
    },
    resolveId(source) {
      if (source.startsWith(VIRTUAL)) return source;
      return null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL)) return null;
      const { names, def, spec } = JSON.parse(
        decodeURIComponent(id.slice(VIRTUAL.length)),
      ) as { names: string[]; def: boolean; spec: string };
      const make = (n: string) =>
        `makeStub(${JSON.stringify(n)}, ${JSON.stringify(spec)})`;
      return [
        `import { makeStub } from ${JSON.stringify(new URL("./stub-component.tsx", import.meta.url).pathname)};`,
        ...names.map((n) => `export const ${n} = ${make(n)};`),
        def ? `export default ${make("default")};` : "",
      ].join("\n");
    },
    buildEnd() {
      if (stubbed.size)
        console.log(
          "[spike] stubbed MDX imports:",
          Object.fromEntries(stubbed),
        );
    },
  };
}
