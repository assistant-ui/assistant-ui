// Errors when a React `useMemo` in tap-hosted code owns mutable state and the
// React Compiler accepts the site: the compiler erases the hook into a `c(n)`
// cache that tap's StrictMode uncommitted replay re-seeds from empty, so the
// factory re-runs and anything bound to the first instance points at a
// discarded copy (#5422). Bailed sites keep tap's cell-based shim `useMemo`
// and are safe — bail hazards are check-resource-memoization's beat. Both
// runtime behaviors are deliberate (the compiler's cache is replay-disposable
// and tap's replay re-seeds it, mirroring React's own StrictMode model); the
// hazard is their composition, guarded here rather than by changing either.
// Out of scope by design: allocations or mutations hidden behind a callee,
// stateful non-container classes (`new StatefulThing()`), container-less
// closure state (`let n` mutated by returned methods), namespace imports
// (`React.useMemo` — zero sites in-repo, named imports are the idiom),
// non-declarator container initialization (assignment, conditional, or
// object-literal init), and containers escaping by value (`return cache`,
// guarded only by the depth-1 result-mutation branch) — this is a guardrail
// for the shape that bit us, not a prover. Opt out an intentional site with a
// `react-usememo-state-ok` comment inside the function.

import { transformAsync, parseAsync, traverse } from "@babel/core";
import { readFileSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Absolute path so the plugin loads regardless of cwd.
const reactCompilerPlugin = createRequire(import.meta.url).resolve(
  "babel-plugin-react-compiler",
);

const CONTAINERS = new Set(["Map", "Set", "WeakMap", "WeakSet"]);
const MUTATORS = new Set(["set", "add", "delete", "clear"]);
const OPT_OUT = "react-usememo-state-ok";

const parserPlugins = (rel) =>
  rel.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"];

const enclosingFunction = (path) => path.getFunctionParent();

// The expressions a factory hands to its caller: every `return` argument of
// the factory itself, or the whole body of an implicit arrow. Identifiers in
// VALUE position in a returned expression are resolved one level to their
// local function or object/array-literal initializers, so a factory that
// hoists its methods into consts and returns `{ on, emit }`, or names its
// API object (`const api = { on }; return api`), escapes through those
// bodies too. A callee (`return xs.map((x) => helper(x))`) is invoked during
// evaluation, not retained in the result, so it does not escape.
const escapeNodes = (factoryPath) => {
  const nodes = new Set();
  const escapePaths = [];
  if (
    factoryPath.node.type === "ArrowFunctionExpression" &&
    factoryPath.node.body.type !== "BlockStatement"
  ) {
    escapePaths.push(factoryPath.get("body"));
  } else {
    factoryPath.traverse({
      ReturnStatement(path) {
        if (
          enclosingFunction(path)?.node === factoryPath.node &&
          path.node.argument
        ) {
          escapePaths.push(path.get("argument"));
        }
      },
    });
  }
  const addBoundFunction = (idPath) => {
    const parent = idPath.parentPath;
    if (
      (parent?.type === "CallExpression" ||
        parent?.type === "OptionalCallExpression") &&
      parent.node.callee === idPath.node
    )
      return;
    const binding = idPath.scope.getBinding(idPath.node.name);
    if (!binding) return;
    const bound = binding.path;
    if (
      bound.type === "VariableDeclarator" &&
      (bound.node.init?.type === "ArrowFunctionExpression" ||
        bound.node.init?.type === "FunctionExpression" ||
        bound.node.init?.type === "ObjectExpression" ||
        bound.node.init?.type === "ArrayExpression")
    ) {
      nodes.add(bound.node.init);
    } else if (bound.type === "FunctionDeclaration") {
      nodes.add(bound.node);
    }
  };
  for (const esc of escapePaths) {
    nodes.add(esc.node);
    if (esc.isIdentifier()) {
      addBoundFunction(esc);
    } else {
      esc.traverse({
        Identifier(path) {
          if (path.isReferencedIdentifier()) addBoundFunction(path);
        },
      });
    }
  }
  return nodes;
};

const withinNodes = (refPath, stopNode, nodes) => {
  for (let p = refPath; p && p.node !== stopNode; p = p.parentPath) {
    if (nodes.has(p.node)) return true;
  }
  return false;
};

// A container is "owned" when a function that escapes through the factory's
// returned expression MUTATES it — those closures outlive the factory call
// and accumulate state on the instance the replay discards. A read-only
// escaping reference (a returned lookup over a derived Map) is recomputable,
// and so is a container filled by synchronous callbacks (forEach/map) or
// non-escaping helpers and copied out. Non-member passthrough (`other(m)`,
// aliasing, returning the container itself) counts as mutating, conservative.
const isMutatingReference = (ref) => {
  const member = ref.parentPath;
  if (
    (member?.type !== "MemberExpression" &&
      member?.type !== "OptionalMemberExpression") ||
    member.node.object !== ref.node
  )
    return true;
  const parent = member.parentPath;
  if (
    parent?.type === "AssignmentExpression" &&
    parent.node.left === member.node
  )
    return true;
  return (
    (parent?.type === "CallExpression" ||
      parent?.type === "OptionalCallExpression") &&
    parent.node.callee === member.node &&
    member.node.property.type === "Identifier" &&
    MUTATORS.has(member.node.property.name)
  );
};

const capturedContainers = (factoryPath) => {
  const escapes = escapeNodes(factoryPath);
  if (escapes.size === 0) return [];
  const captured = [];
  factoryPath.traverse({
    NewExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== "Identifier" || !CONTAINERS.has(callee.name)) return;
      // Ignore shadowed globals (a local class named Map).
      if (path.scope.getBinding(callee.name)) return;
      let declarator = path.parentPath;
      while (
        declarator?.type === "TSAsExpression" ||
        declarator?.type === "TSSatisfiesExpression" ||
        declarator?.type === "TSNonNullExpression" ||
        declarator?.type === "TSTypeAssertion" ||
        declarator?.type === "ParenthesizedExpression"
      ) {
        declarator = declarator.parentPath;
      }
      if (
        declarator?.type !== "VariableDeclarator" ||
        declarator.node.id.type !== "Identifier"
      )
        return;
      // A container allocated inside a nested function is created per call,
      // not owned by the memo instance; only factory-scope declarations count.
      if (enclosingFunction(path)?.node !== factoryPath.node) return;
      const binding = declarator.scope.getBinding(declarator.node.id.name);
      if (!binding) return;
      const escaping = (ref) =>
        enclosingFunction(ref)?.node !== factoryPath.node &&
        withinNodes(ref, factoryPath.node, escapes);
      const owned =
        binding.constantViolations.some(escaping) ||
        binding.referencePaths.some(
          (ref) => escaping(ref) && isMutatingReference(ref),
        );
      if (owned) {
        captured.push({ name: declarator.node.id.name, class: callee.name });
      }
    },
  });
  return captured;
};

// The memo result is mutated directly in the function that owns the useMemo
// call: a member assignment (`cell.v = value`) or a container-mutator call
// (`cache.set(k, v)`) one level deep. Either way the render writes to an
// instance the replay may have discarded. Mutations inside nested callbacks
// run post-commit against the committed instance and are excluded; deeper
// chains (`state.cache.set(…)`) are out of scope — the nested object may be
// owned elsewhere (external-message-converter bundles useState-owned caches
// into a recomputable memo exactly this way).
const resultMutations = (memoPath) => {
  const declarator = memoPath.parentPath;
  if (
    declarator?.type !== "VariableDeclarator" ||
    declarator.node.id.type !== "Identifier"
  )
    return [];
  const binding = declarator.scope.getBinding(declarator.node.id.name);
  if (!binding) return [];
  const hostFn = enclosingFunction(memoPath)?.node;
  const name = declarator.node.id.name;
  const mutations = new Set();
  for (const ref of binding.referencePaths) {
    if (enclosingFunction(ref)?.node !== hostFn) continue;
    const member = ref.parentPath;
    if (
      (member?.type !== "MemberExpression" &&
        member?.type !== "OptionalMemberExpression") ||
      member.node.object !== ref.node ||
      member.node.property.type !== "Identifier"
    )
      continue;
    const prop = member.node.property.name;
    const parent = member.parentPath;
    if (
      parent?.type === "AssignmentExpression" &&
      parent.node.left === member.node
    ) {
      mutations.add(`\`${name}.${prop} = …\``);
    } else if (
      (parent?.type === "CallExpression" ||
        parent?.type === "OptionalCallExpression") &&
      parent.node.callee === member.node &&
      MUTATORS.has(prop)
    ) {
      mutations.add(`\`${name}.${prop}(…)\``);
    }
  }
  return [...mutations];
};

export const analyzeFile = async (rel, code) => {
  const lines = code.split("\n");

  const ast = await parseAsync(code, {
    filename: join(repoRoot, rel),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: parserPlugins(rel) },
  });

  // Collect React useMemo sites whose factory owns mutable state. The callee
  // must resolve to the `useMemo` import from "react" (aliases included, local
  // shadows excluded): tap's own useMemo is cell-based and replay-safe, so
  // only the React import matters.
  const isReactUseMemoBinding = (binding) => {
    const spec = binding?.path;
    return (
      spec?.type === "ImportSpecifier" &&
      spec.node.imported.type === "Identifier" &&
      spec.node.imported.name === "useMemo" &&
      spec.parentPath.node.source.value === "react"
    );
  };

  const candidates = []; // { line, reasons }
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== "Identifier") return;
      if (!isReactUseMemoBinding(path.scope.getBinding(callee.name))) return;
      const factory = path.get("arguments.0");
      if (
        !factory ||
        (factory.type !== "ArrowFunctionExpression" &&
          factory.type !== "FunctionExpression")
      )
        return;
      const reasons = [
        ...capturedContainers(factory).map(
          (c) => `closure captures \`${c.name}\` (new ${c.class})`,
        ),
        ...resultMutations(path).map((m) => `result mutated in render: ${m}`),
      ];
      if (reasons.length === 0) return;
      candidates.push({ line: path.node.loc.start.line, reasons });
    },
  });
  if (candidates.length === 0)
    return { candidates, violations: [], allowed: [] };

  // Compile once and keep only sites the compiler accepts: a compiled site
  // becomes a replay-disposable `c(n)` cache, while a bailed site keeps raw
  // useMemo semantics (routed to tap's replay-safe shim). "No event" is not
  // "compiled" — helpers the compiler never processes also keep the shim.
  const compiled = []; // { start, end }
  await transformAsync(code, {
    filename: join(repoRoot, rel),
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: parserPlugins(rel) },
    plugins: [
      [
        reactCompilerPlugin,
        {
          logger: {
            logEvent(_filename, event) {
              if (event.kind !== "CompileSuccess") return;
              const start = event.fnLoc?.start?.line;
              const end = event.fnLoc?.end?.line;
              if (start == null || end == null) return;
              compiled.push({ start, end });
            },
          },
        },
      ],
    ],
  });

  const violations = [];
  const allowed = [];
  for (const { line, reasons } of candidates) {
    const range = compiled.find((r) => line >= r.start && line <= r.end);
    if (!range) continue;

    const optedOut = lines
      .slice(range.start - 1, range.end)
      .some((l) => l.includes(OPT_OUT));
    const record = { rel, line, reasons, call: lines[line - 1].trim() };
    (optedOut ? allowed : violations).push(record);
  }
  return { candidates, violations, allowed };
};

const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  // Only packages aui-build compiles and routes through the tap react-shim
  // (mirrors the dependsOnTap gate in src/index.ts). tap itself is never
  // compiled; packages without tap run real React useMemo, which survives
  // StrictMode replays.
  const packages = globSync("packages/*/package.json", {
    cwd: repoRoot,
  }).filter((rel) => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, rel), "utf8"));
    if (pkg.name === "@assistant-ui/tap") return false;
    return ["dependencies", "peerDependencies"].some(
      (field) => pkg[field]?.["@assistant-ui/tap"],
    );
  });

  const files = packages
    .flatMap((pkgJson) =>
      globSync(join(dirname(pkgJson), "src/**/*.{ts,tsx}"), { cwd: repoRoot }),
    )
    .filter(
      (f) =>
        !f.includes("/__tests__/") &&
        !/\.(test|bench)\.[tj]sx?$/.test(f) &&
        !f.endsWith(".d.ts"),
    )
    .filter((f) => /\buseMemo\b/.test(readFileSync(join(repoRoot, f), "utf8")));

  const violations = [];
  const allowed = [];
  for (const rel of files) {
    const result = await analyzeFile(
      rel,
      readFileSync(join(repoRoot, rel), "utf8"),
    );
    violations.push(...result.violations);
    allowed.push(...result.allowed);
  }

  if (allowed.length) {
    console.log(
      `\nℹ️  ${allowed.length} opted-out useMemo owned-state site(s):`,
    );
    for (const a of allowed) {
      console.log(`   ${a.rel}:${a.line}  (${a.reasons.join("; ")})`);
    }
  }

  if (violations.length) {
    console.error(
      `\n❌ ${violations.length} React useMemo site(s) in tap-hosted compiled code own mutable state.\n` +
        `   React Compiler turns them into a c(n) cache that tap's StrictMode uncommitted\n` +
        `   replay re-seeds from empty, so the state is re-created and anything bound to\n` +
        `   the first instance points at a discarded copy (#5422):\n`,
    );
    for (const v of violations) {
      console.error(`   ${v.rel}:${v.line}`);
      console.error(`     call:  ${v.call}`);
      console.error(`     why:   ${v.reasons.join("; ")}`);
    }
    console.error(
      `\n   If the memo genuinely owns the state, own it with lazy useState instead:\n` +
        `   \`const [x] = useState(() => …)\` (see packages/core/src/react/runtimes/\n` +
        `   external-message-converter.ts, which documents the invariant). If the\n` +
        `   container is derived from the deps and only read back — this check flags\n` +
        `   escaping passthrough conservatively — the site is replay-safe: add a\n` +
        `   \`${OPT_OUT}\` comment inside the function.\n`,
    );
    process.exit(1);
  }

  console.log(
    `\n✅ All ${files.length} useMemo-bearing tap-hosted file(s) are clean — no React` +
      ` useMemo owns mutable state in compiled code.`,
  );
}
