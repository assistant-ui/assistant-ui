import { Fragment } from "react";
import { highlight } from "fumadocs-core/highlight";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  TypeTableClient,
  type TypeTableRow,
} from "./primitives-type-table-client";

type PropDef = {
  name: string;
  type?: string;
  description?: string | ReactNode;
  default?: string;
  required?: boolean;
  deprecated?: string;
  children?: Array<{ type?: string; parameters: PropDef[] }>;
};

const COMMON_PARAMS: Record<string, Partial<PropDef>> = {
  asChild: {
    type: "boolean",
    default: "false",
    description: (
      <>
        Change the default rendered element for the one passed as a child,
        merging their props and behavior.{" "}
        <Link
          className="font-medium text-fd-primary underline underline-offset-2"
          href="/docs/api-reference/primitives/composition"
        >
          Composition guide
        </Link>
      </>
    ),
  },
};

async function highlightType(type: string): Promise<ReactNode> {
  if (!type) return null;
  return highlight(type, {
    lang: "typescript",
    themes: { light: "github-light", dark: "github-dark" },
  });
}

function stripTrailingUndefined(typeRaw: string): string {
  return typeRaw.replace(/\s*\|\s*undefined\s*$/, "").trim();
}

function getShortType(typeRaw: string): string | undefined {
  if (!typeRaw) return undefined;
  if (typeRaw.length <= 60 && !typeRaw.includes("{")) return undefined;

  // Replace object literal bodies with "object"
  let short = typeRaw.replace(/\{[^{}]*\}/g, "object");

  // Collapse "object | object | ..." into single "object"
  short = short.replace(/\bobject\b(\s*\|\s*\bobject\b)+/g, "object");

  if (short.length > 60) short = short.substring(0, 57) + "...";
  if (short === typeRaw) return undefined;
  return short;
}

async function propsToRows(props: PropDef[]): Promise<TypeTableRow[]> {
  return Promise.all(
    props.map(async (raw) => {
      const prop = { ...COMMON_PARAMS[raw.name], ...raw };

      const descParts: ReactNode[] = [];
      if (prop.deprecated) {
        descParts.push(
          <div
            key="dep"
            className="mb-1 text-amber-600 text-xs dark:text-amber-400"
          >
            Deprecated: {prop.deprecated}
          </div>,
        );
      }
      if (prop.description) {
        if (
          typeof prop.description === "string" &&
          prop.description.includes("\n")
        ) {
          const lines = prop.description.split("\n");
          descParts.push(
            <span key="desc">
              {lines.map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </span>,
          );
        } else {
          descParts.push(<span key="desc">{prop.description}</span>);
        }
      }
      if (prop.name.startsWith("unstable_")) {
        descParts.push(
          <span
            key="unstable"
            className="ml-2 inline-block rounded bg-purple-500/10 px-1.5 py-0.5 font-medium text-purple-600 text-xs dark:text-purple-400"
          >
            unstable
          </span>,
        );
      }

      // Highlight the type (clean version for collapsed row, full for expanded)
      const typeRaw = prop.type ?? "";
      const displayType = stripTrailingUndefined(typeRaw);
      const shortType = getShortType(displayType);
      const highlightedType = displayType
        ? await highlightType(shortType ?? displayType)
        : null;

      // Always highlight the full type for the expanded "Type" row
      const highlightedTypeFull = typeRaw
        ? await highlightType(typeRaw)
        : undefined;

      let children:
        | { type?: string | undefined; rows: TypeTableRow[] }[]
        | undefined;
      if (prop.children?.length) {
        children = await Promise.all(
          prop.children.map(async (child) => ({
            type: child.type,
            rows: await propsToRows(child.parameters),
          })),
        );
      }

      return {
        name: prop.name,
        type: highlightedType,
        typeFull: highlightedTypeFull,
        typeRaw,
        description: descParts.length > 0 ? <>{descParts}</> : undefined,
        default: prop.default,
        required: prop.required ?? false,
        deprecated: !!prop.deprecated,
        deprecatedMessage: prop.deprecated,
        children,
      } satisfies TypeTableRow;
    }),
  );
}

export async function PrimitivesTypeTable({
  type,
  parameters,
}: {
  type?: string;
  parameters: PropDef[];
}) {
  const rows = await propsToRows(parameters);
  return <TypeTableClient id={type} rows={rows} />;
}
