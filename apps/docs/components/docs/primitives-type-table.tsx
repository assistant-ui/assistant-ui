import { Fragment } from "react";
import { highlight } from "fumadocs-core/highlight";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  TypeTableClient,
  type TypeTableRow,
} from "./primitives-type-table-client";
import { StatusBadge } from "./status-badge";

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
    defaultColor: false,
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

  if (short.length > 60) short = `${short.substring(0, 57)}...`;
  if (short === typeRaw) return undefined;
  return short;
}

async function propsToRows(props: PropDef[]): Promise<TypeTableRow[]> {
  return Promise.all(
    props.map(async (raw) => {
      const prop = { ...COMMON_PARAMS[raw.name], ...raw };

      const descParts: ReactNode[] = [
        prop.deprecated && (
          <Fragment key="deprecated">
            <StatusBadge variant="deprecated" className="mr-1" />
            <span>{prop.deprecated}</span>
          </Fragment>
        ),
        prop.name.startsWith("unstable_") && (
          <StatusBadge key="unstable" variant="unstable" className="mr-1" />
        ),
        prop.description &&
          (typeof prop.description === "string" &&
          prop.description.includes("\n") ? (
            <span key="description">
              {prop.description.split("\n").map((line, i) => (
                <Fragment key={i}>
                  {i > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </span>
          ) : (
            <span key="description">{prop.description}</span>
          )),
      ].filter(Boolean);

      // Highlight the type (clean version for collapsed row, full for expanded)
      const typeRaw = prop.type ?? "";
      const displayType = stripTrailingUndefined(typeRaw);
      const shortType = getShortType(displayType);
      const highlightedType = displayType
        ? await highlightType(shortType ?? displayType)
        : null;

      const highlightedTypeFull =
        typeRaw && (shortType != null || displayType !== typeRaw)
          ? await highlightType(typeRaw)
          : undefined;
      const highlightedDefault = prop.default
        ? await highlightType(prop.default)
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
        description: descParts.length > 0 ? descParts : undefined,
        default: highlightedDefault,
        required: prop.required ?? false,
        deprecated: !!prop.deprecated,
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
