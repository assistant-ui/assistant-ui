import { createRequire } from "node:module";

const ts = createRequire(
  new URL("../packages/x-buildutils/package.json", import.meta.url),
)("typescript");
const printer = ts.createPrinter({ removeComments: true });
const metrics = new Set(["lines", "functions", "branches", "statements"]);

export const isCoverageConfig = (path) =>
  /(?:^|\/)(?:vitest|vite)\.config\.[cm]?[jt]s$/.test(path);

function unwrap(node) {
  while (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  )
    node = node.expression;
  return node;
}

function normalized(node, source) {
  const printed = printer.printNode(ts.EmitHint.Unspecified, node, source);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    printed,
  );
  const tokens = [];
  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    if (
      [
        ts.SyntaxKind.CloseBracketToken,
        ts.SyntaxKind.CloseBraceToken,
        ts.SyntaxKind.CloseParenToken,
      ].includes(kind) &&
      tokens.at(-1) === ","
    )
      tokens.pop();
    tokens.push(
      kind === ts.SyntaxKind.StringLiteral
        ? JSON.stringify(scanner.getTokenValue())
        : scanner.getTokenText(),
    );
  }
  return tokens.join(" ");
}

function settings(text) {
  if (text === null) return [];
  const source = ts.createSourceFile(
    "config.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  if (source.parseDiagnostics.length) return null;
  const blocks = [];
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source).replace(/^["']|["']$/g, "") === "coverage"
    ) {
      const values = new Map();
      const read = (expression, keys) => {
        const value = unwrap(expression);
        if (ts.isObjectLiteralExpression(value)) {
          for (const [index, property] of value.properties.entries()) {
            if (
              ts.isPropertyAssignment(property) &&
              (ts.isIdentifier(property.name) ||
                ts.isStringLiteral(property.name))
            ) {
              read(property.initializer, [...keys, property.name.text]);
            } else {
              values.set(JSON.stringify([...keys, `<computed:${index}>`]), {
                keys,
                computed: true,
                text: normalized(property, source),
              });
            }
          }
          return;
        }
        const printed = normalized(value, source);
        values.set(JSON.stringify(keys), {
          keys,
          text: printed,
          number: ts.isNumericLiteral(value)
            ? Number(value.text)
            : ts.isPrefixUnaryExpression(value) &&
                value.operator === ts.SyntaxKind.MinusToken &&
                ts.isNumericLiteral(value.operand)
              ? -Number(value.operand.text)
              : null,
        });
      };
      read(node.initializer, []);
      blocks.push(values);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return blocks;
}

const code = (value) => {
  const text = String(value).replace(/\s+/g, " ").slice(0, 200);
  const fence = "`".repeat(
    Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length)) + 1,
  );
  return `${fence} ${text} ${fence}`;
};

export function coverageAdvice({ path, base, head }) {
  if (base === head || base === null) return [];
  const before = settings(base);
  const after = settings(head);
  if (before === null || after === null)
    return [
      `coverage configuration in ${code(path)} could not be parsed; review its thresholds and measured files manually`,
    ];
  const lines = [];
  Array.from({ length: Math.max(before.length, after.length) }).forEach(
    (_, index) => {
      const oldValues = before[index] ?? new Map();
      const newValues = after[index];
      const where = `${code(path)}${before.length > 1 ? ` (coverage block ${index + 1})` : ""}`;
      if (!newValues) {
        lines.push(
          `coverage configuration removed from ${where}; confirm the replacement still measures and gates the same source`,
        );
        return;
      }
      for (const key of new Set([...oldValues.keys(), ...newValues.keys()])) {
        const oldValue = oldValues.get(key);
        const newValue = newValues.get(key);
        if (oldValue?.text === newValue?.text) continue;
        const keys = (oldValue ?? newValue).keys;
        const setting = code(["coverage", ...keys].join("."));
        if (keys[0] === "thresholds") {
          if (oldValue === undefined) {
            if (newValue.computed)
              lines.push(
                `${setting} adds computed settings in ${where}; review the coverage gate manually`,
              );
            continue;
          }
          if (newValue === undefined) {
            lines.push(
              `${setting} removed in ${where} (was ${code(oldValue.text)})`,
            );
          } else if (
            metrics.has(keys.at(-1)) &&
            oldValue.number !== null &&
            newValue.number !== null
          ) {
            if (
              Math.sign(oldValue.number) === Math.sign(newValue.number) ||
              (oldValue.number >= 0 && newValue.number >= 0)
            ) {
              if (newValue.number < oldValue.number)
                lines.push(
                  `${setting} lowered from ${oldValue.number} to ${newValue.number} in ${where}`,
                );
            } else {
              lines.push(
                `${setting} changed from ${oldValue.number} to ${newValue.number} in ${where}; review the percentage versus uncovered-count limit`,
              );
            }
          } else {
            lines.push(
              `${setting} changed in ${where}; verify the coverage gate is preserved`,
            );
          }
        } else if (["include", "exclude"].includes(keys[0])) {
          lines.push(
            `${setting} changed in ${where}: ${code(oldValue?.text ?? "default")} to ${code(newValue?.text ?? "default")}; review which source files are measured`,
          );
        } else if (keys[0] === "enabled" && newValue?.text === "false") {
          lines.push(`coverage disabled in ${where}`);
        } else if (keys.length === 0) {
          lines.push(
            `computed coverage configuration changed in ${where}; review its thresholds and measured files manually`,
          );
        }
      }
    },
  );
  return lines;
}
