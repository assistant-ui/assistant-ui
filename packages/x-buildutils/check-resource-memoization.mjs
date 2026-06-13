// Errors when a function hosting a tap resource (useResource / useResources /
// useClientLookup) bails the React Compiler, leaving its inline element/array
// argument un-memoized. Opt out an intentional bail with a
// `react-compiler-bail-ok` comment inside the function.

import { transformAsync, parseAsync, traverse } from "@babel/core";
import { readFileSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Absolute path so the plugin loads regardless of cwd.
const reactCompilerPlugin = createRequire(import.meta.url).resolve(
  "babel-plugin-react-compiler",
);

const HOSTING_HOOKS = new Set([
  "useResource",
  "useResources",
  "useClientLookup",
]);
// Quick text prefilter so we only parse/compile files that host resources.
const HOSTING_CALL = /\b(useResources?|useClientLookup)\(/;
const OPT_OUT = "react-compiler-bail-ok";

const parserPlugins = (rel) =>
  rel.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"];

// Only flag args built in place. A param/prop passthrough (`useResource(element)`,
// `useResource(props.host)`) is memoized by the caller, not this function.
const isConstructedHere = (arg, path) => {
  if (!arg) return false;
  // Walk a member expression down to its root object identifier.
  let root = arg;
  while (
    root.type === "MemberExpression" ||
    root.type === "OptionalMemberExpression"
  ) {
    root = root.object;
  }
  if (root.type === "Identifier" && root !== arg) {
    // `x.y` passthrough — constructed here only if `x` is a local (non-param).
    const binding = path.scope.getBinding(root.name);
    return binding != null && binding.kind !== "param";
  }
  if (arg.type === "Identifier") {
    const binding = path.scope.getBinding(arg.name);
    return binding != null && binding.kind !== "param";
  }
  // Object/array literal, factory call, ternary, etc. — built in place.
  return true;
};

const files = globSync("packages/*/src/**/*.{ts,tsx}", { cwd: repoRoot })
  // tap defines these hooks and is never React-Compiled; skip it and non-source.
  .filter(
    (f) =>
      !f.startsWith("packages/tap/") &&
      !f.includes("/__tests__/") &&
      !/\.(test|bench)\.[tj]sx?$/.test(f) &&
      !f.endsWith(".d.ts"),
  )
  .filter((f) => HOSTING_CALL.test(readFileSync(join(repoRoot, f), "utf8")));

const violations = [];
const allowed = [];

for (const rel of files) {
  const code = readFileSync(join(repoRoot, rel), "utf8");
  const lines = code.split("\n");

  // Collect resource-hosting calls whose element/array is constructed in place.
  const ast = await parseAsync(code, {
    filename: join(repoRoot, rel),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: parserPlugins(rel) },
  });
  const hostingCalls = []; // { line }
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== "Identifier" || !HOSTING_HOOKS.has(callee.name))
        return;
      if (!isConstructedHere(path.node.arguments[0], path)) return;
      hostingCalls.push({ line: path.node.loc.start.line });
    },
  });
  if (hostingCalls.length === 0) continue;

  // Compile and collect every bailed function range.
  const bails = new Map(); // `start-end` -> {start, end, reason}
  await transformAsync(code, {
    filename: join(repoRoot, rel),
    babelrc: false,
    configFile: false,
    parserOpts: {
      plugins: rel.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"],
    },
    plugins: [
      [
        reactCompilerPlugin,
        {
          logger: {
            logEvent(_filename, event) {
              if (event.kind !== "CompileError") return;
              const start = event.fnLoc?.start?.line;
              const end = event.fnLoc?.end?.line;
              if (start == null || end == null) return;
              const reason = (
                event.detail?.description ||
                event.detail?.reason ||
                "unknown"
              ).split("\n")[0];
              bails.set(`${start}-${end}`, { start, end, reason });
            },
          },
        },
      ],
    ],
  });

  for (const { line } of hostingCalls) {
    const range = [...bails.values()].find(
      (b) => line >= b.start && line <= b.end,
    );
    if (!range) continue;

    const optedOut = lines
      .slice(range.start - 1, range.end)
      .some((l) => l.includes(OPT_OUT));
    const record = { rel, line, range, call: lines[line - 1].trim() };
    (optedOut ? allowed : violations).push(record);
  }
}

if (allowed.length) {
  console.log(`\nℹ️  ${allowed.length} opted-out resource-hosting bail(s):`);
  for (const a of allowed) {
    console.log(`   ${a.rel}:${a.line}  (${a.range.reason})`);
  }
}

if (violations.length) {
  console.error(
    `\n❌ ${violations.length} resource-hosting function(s) bail out of the React Compiler,\n` +
      `   so their element/array argument is NOT memoized:\n`,
  );
  for (const v of violations) {
    console.error(`   ${v.rel}:${v.line}`);
    console.error(`     call:  ${v.call}`);
    console.error(
      `     why:   compiler skips its function (lines ${v.range.start}-${v.range.end}): ${v.range.reason}`,
    );
  }
  console.error(
    `\n   Fix the compiler bail (preferred), or, if the bail is intentional and\n` +
      `   unavoidable, add a \`${OPT_OUT}\` comment inside the offending function.\n`,
  );
  process.exit(1);
}

console.log(
  `\n✅ All ${files.length} resource-hosting file(s) compile cleanly — every` +
    ` useResource/useResources/useClientLookup argument is memoized.`,
);
