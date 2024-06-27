import { createHash } from "node:crypto";

import postcss from "postcss";
import * as recast from "recast";
import * as tsParser from "recast/parsers/babel-ts.js";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

import { replaceVariableScope } from "./replace-variable-scope";

/**
 * A map of hashed classnames from Tailwind CSS classes and their original values
 */
type StyleCache = Map<string, string>;

const clRegex = /^aui-[a-z0-9]{8}$/;

function isBinaryExpression(node: recast.types.namedTypes.BinaryExpression) {
  return recast.types.namedTypes.BinaryExpression.check(node);
}

function isLogicalExpression(node: recast.types.namedTypes.LogicalExpression) {
  return recast.types.namedTypes.LogicalExpression.check(node);
}

function isRightmostOperand(path: any) {
  let parentPath = path.parentPath;
  while (isLogicalExpression(parentPath.node)) {
    if (parentPath.node.right !== path.node) {
      return false;
    }
    parentPath = parentPath.parentPath;
  }
  return true;
}

function generateHashedClassName(value: string) {
  return (
    "aui-" +
    createHash("sha256").update(value, "utf8").digest("hex").slice(0, 8)
  );
}

function visitNode(
  node: recast.types.ASTNode,
  ctx: { styleCache: StyleCache },
  visitors?: recast.types.Visitor,
) {
  recast.visit(node, {
    visitStringLiteral(path) {
      if (clRegex.test(path.node.value)) {
        return false;
      }
      if (isBinaryExpression(path.parentPath.node)) {
        return false;
      }
      if (
        isLogicalExpression(path.parentPath.node) &&
        !isRightmostOperand(path)
      ) {
        return false;
      }
      if (
        path.parentPath.node.type === "ObjectProperty" &&
        path.parentPath.node.key === path.node
      ) {
        return false;
      }

      const cn = generateHashedClassName(path.node.value);
      ctx.styleCache.set(cn, path.node.value);
      path.node.value = cn;
      return false;
    },
    ...visitors,
  });
}

export function transform(code: string, ctx: { styleCache: StyleCache }) {
  const ast = recast.parse(code, { parser: tsParser });

  recast.visit(ast, {
    // visit className attributes containing TW classes
    visitJSXAttribute(path) {
      const node = path.node;
      if (node.name.name === "className") {
        visitNode(node, ctx, {
          // Stop traversal if we encounter a function call
          // cn/cx/clsx/cva are handled by the `visitCallExpression` visitor
          visitCallExpression() {
            return false;
          },
        });
      }
      this.traverse(path);
    },
    // visit a `className` property within any object containing TW classes
    visitObjectProperty(path) {
      const node = path.node;
      if (
        path.node.key.type === "Identifier" &&
        path.node.key.name === "className"
      ) {
        visitNode(node, ctx);
      }
      this.traverse(path);
    },
    // visit function calls containing TW classes
    visitCallExpression(path) {
      const node = path.node;
      // `className` concatenation functions
      if (
        node.callee.type === "Identifier" &&
        ["cn", "cx", "clsx"].includes(node.callee.name)
      ) {
        visitNode(node, ctx);
      }
      // cva functions (note: only compatible with cva@1.0)
      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "cva" &&
        node.arguments[0]?.type === "ObjectExpression"
      ) {
        for (const property of node.arguments[0].properties) {
          if (
            property.type === "ObjectProperty" &&
            property.key.type === "Identifier" &&
            ["base", "variants"].includes(property.key.name)
          ) {
            visitNode(property, ctx);
          }
        }
      }
      this.traverse(path);
    },
  });

  return recast.print(ast).code;
}

export async function generateStylesheet(
  styleCache: StyleCache,
  ctx: { globalCss: string },
) {
  let stylesheet = "@tailwind base;\n\n";

  if (ctx.globalCss) {
    stylesheet += ctx.globalCss + "\n";
  }

  for (const [cn, value] of styleCache) {
    stylesheet += `.${cn} { @apply ${value} }\n`;
  }

  const result = await postcss([
    tailwindcss(),
    replaceVariableScope,
    autoprefixer(),
  ]).process(stylesheet, {
    from: "styles.css",
  });

  return result.css.replace(/\n\n/g, "\n");
}
