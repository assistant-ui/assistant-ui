// Custom oxlint JS plugin: tap-hooks.
//
// Provides two rules:
//   - `exhaustive-deps`  — tap-aware wrapper around eslint-plugin-react-hooks's
//                          `exhaustive-deps` (see below).
//   - `named-resource`   — requires `resource()` to wrap a *named* function so
//                          React's rules-of-hooks (which keys on the function
//                          name) lints hook usage inside resource bodies.
//
// exhaustive-deps wrapper: the tap engine hooks use their React names
// (useState, useRef, useEffect, useMemo, ...), so eslint-plugin-react-hooks
// already understands the stable ones (useRef / useEffectEvent / useState's
// setter). The one tap-specific case it cannot know is `useMemo(fn, [])`: tap's
// memo never evicts its cache (unlike React's), so empty deps means compute-once
// and the result is permanently stable. This wrapper drops "missing dependency"
// warnings for that case.

import reactHooksPlugin from "eslint-plugin-react-hooks";

const innerRule = reactHooksPlugin.rules["exhaustive-deps"];

// Pull dep names from the rule's message strings:
//   "has a missing dependency: 'foo'"
//   "has missing dependencies: 'foo' and 'bar'"
//   "has missing dependencies: 'foo', 'bar', and 'baz'"
// Returns [] if the message isn't a missing-deps message.
function extractMissingDeps(message) {
  const match = message.match(/missing depend\w+:\s*(.+?)(?:\.|$)/);
  if (!match) return [];
  const list = match[1];
  return Array.from(list.matchAll(/'([^']+)'/g), (m) => m[1]);
}

function rootIdentifier(depName) {
  const dot = depName.indexOf(".");
  return dot === -1 ? depName : depName.slice(0, dot);
}

function isStableDep(depName, scope) {
  const root = rootIdentifier(depName);
  const variable = findVariable(scope, root);
  if (!variable || !variable.defs || variable.defs.length === 0) return false;

  const def = variable.defs[0];
  const defNode = def.node;
  if (defNode.type !== "VariableDeclarator") return false;

  let init = defNode.init;
  if (!init) return false;
  while (init.type === "TSAsExpression" || init.type === "AsExpression") {
    init = init.expression;
  }
  if (init.type !== "CallExpression") return false;

  const callee = init.callee;
  if (callee.type !== "Identifier") return false;

  // `useMemo(fn, [])` is permanently stable: tap's memo never evicts its cache
  // (unlike React's useMemo), so an empty dep array means compute-once.
  if (callee.name === "useMemo") {
    const depsArg = init.arguments[1];
    return (
      depsArg &&
      depsArg.type === "ArrayExpression" &&
      depsArg.elements.length === 0
    );
  }

  return false;
}

function findVariable(scope, name) {
  for (let s = scope; s; s = s.upper) {
    const v = s.variables.find((v) => v.name === name);
    if (v) return v;
  }
  return null;
}

// The `useMemo(fn, [])` stability exemption only holds for tap's engine memo,
// which never evicts. React's `useMemo` may drop its cache, so the exemption
// must not apply to ordinary React code. It is scoped to tap's own source.
const TAP_SRC = /[/\\]packages[/\\]tap[/\\]src[/\\]/;

const wrappedRule = {
  meta: innerRule.meta,
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? "";
    if (!TAP_SRC.test(filename)) return innerRule.create(context);

    // `context.report` is a non-configurable, non-writable data property, so
    // neither a Proxy nor plain assignment on a prototype-derived object can
    // shadow it (strict-mode invariant). `defineProperty` skips that check by
    // defining a fresh own property directly.
    const wrapped = Object.create(context);
    Object.defineProperty(wrapped, "report", {
      value: (descriptor) => {
        const message =
          typeof descriptor.message === "string" ? descriptor.message : "";
        const deps = extractMissingDeps(message);
        if (deps.length > 0) {
          const node = descriptor.node;
          const scope = node
            ? context.sourceCode.getScope(node)
            : context.getScope();
          if (deps.every((d) => isStableDep(d, scope))) return;
        }
        return context.report(descriptor);
      },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return innerRule.create(wrapped);
  },
};

// `react/rules-of-hooks` only lints hook calls inside a function it recognizes
// as a component or hook, and it recognizes them *by name*: a PascalCase or
// `use`-prefixed `FunctionDeclaration`/named `FunctionExpression`. A resource
// authored as `resource(() => {...})` or `resource(function () {...})` is an
// anonymous callback to a call expression, so rules-of-hooks skips its body
// entirely. Requiring a named function expression — `resource(function Name()
// {...})` — makes rules-of-hooks kick in (and gives the resource a real
// `fn.name` for keys/devtools).
const PASCAL_OR_USE = /^([A-Z]|use[A-Z0-9])/;

const namedResourceRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "require resource() to wrap a named function so React's rules-of-hooks lints its body",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "resource") return;
        const fn = node.arguments[0];
        if (!fn) return;

        const isArrow = fn.type === "ArrowFunctionExpression";
        const isAnonFnExpr = fn.type === "FunctionExpression" && !fn.id;
        if (isArrow || isAnonFnExpr) {
          context.report({
            node: fn,
            message:
              "resource() must wrap a named function expression (e.g. `resource(function MyResource() { ... })`) so React's rules-of-hooks lints hook usage inside it.",
          });
          return;
        }

        if (
          fn.type === "FunctionExpression" &&
          fn.id &&
          !PASCAL_OR_USE.test(fn.id.name)
        ) {
          context.report({
            node: fn.id,
            message: `resource() function name "${fn.id.name}" must be PascalCase or use-prefixed so React's rules-of-hooks recognizes it as a component/hook.`,
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "tap-hooks" },
  rules: {
    "exhaustive-deps": wrappedRule,
    "named-resource": namedResourceRule,
  },
};

export default plugin;
