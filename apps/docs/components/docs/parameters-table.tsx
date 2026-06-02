import { cn } from "@/lib/utils";
import Link from "next/link";
import type { FC, ReactNode } from "react";
import { StatusBadge } from "./status-badge";

const DESCRIPTION_LINK_CLASSNAME =
  "font-medium text-foreground underline underline-offset-2";

type ParameterDef = {
  name: string;
  type?: string;
  description: string | ReactNode;
  required?: boolean;
  default?: string;
  deprecated?: string;
  children?: Array<ParametersTableProps>;
};

const COMMON_PARAMS: Record<string, ParameterDef> = {
  asChild: {
    name: "asChild",
    type: "boolean",
    default: "false",
    description: (
      <>
        Change the default rendered element for the one passed as a child,
        merging their props and behavior.
        <br />
        <br />
        Read the{" "}
        <Link
          className={DESCRIPTION_LINK_CLASSNAME}
          href="/docs/api-reference/primitives/composition"
        >
          Composition
        </Link>{" "}
        guide for more details.
      </>
    ),
  },
};

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderLinkLabel(label: string): ReactNode {
  if (label.startsWith("`") && label.endsWith("`")) {
    return <code>{label.slice(1, -1)}</code>;
  }
  return label;
}

export function renderDescription(description: string | ReactNode): ReactNode {
  if (typeof description !== "string") return description;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of description.matchAll(MARKDOWN_LINK_REGEX)) {
    const fullMatch = match[0]!;
    const label = match[1]!;
    const linkHref = match[2]!;
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push(description.slice(lastIndex, index));
    }

    const children = renderLinkLabel(label);
    parts.push(
      linkHref.startsWith("/") ? (
        <Link
          key={`${linkHref}-${index}`}
          className={DESCRIPTION_LINK_CLASSNAME}
          href={linkHref}
        >
          {children}
        </Link>
      ) : (
        <a
          key={`${linkHref}-${index}`}
          className={DESCRIPTION_LINK_CLASSNAME}
          href={linkHref}
        >
          {children}
        </a>
      ),
    );
    lastIndex = index + fullMatch.length;
  }

  if (lastIndex === 0) return description;
  if (lastIndex < description.length) parts.push(description.slice(lastIndex));
  return parts;
}

const Parameter: FC<{
  parameter: ParameterDef;
  isNested?: boolean | undefined;
}> = ({ parameter: partialParameter, isNested }) => {
  const parameter = {
    ...COMMON_PARAMS[partialParameter.name],
    ...partialParameter,
  };

  const isOptional = !parameter.required && !parameter.default;

  return (
    <div
      className={cn(
        "group border-border/50 border-b px-4 py-3 last:border-b-0",
        isNested && "bg-muted/30",
      )}
    >
      <dt>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <code className="text-foreground font-mono text-sm font-semibold">
            {parameter.name}
          </code>
          {parameter.deprecated && <StatusBadge variant="deprecated" />}
          {parameter.name.startsWith("unstable_") && (
            <StatusBadge variant="unstable" />
          )}
          {parameter.type && (
            <>
              {" "}
              <code className="text-muted-foreground font-mono text-xs">
                {isOptional && "?"}
                {": "}
                {parameter.type}
              </code>
            </>
          )}
          {parameter.default && (
            <>
              {" "}
              <span className="text-muted-foreground font-mono text-xs">
                = {parameter.default}
              </span>
            </>
          )}
        </div>
      </dt>
      <dd className="pt-2">
        <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
          {renderDescription(parameter.description)}
        </p>

        {parameter.deprecated && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Deprecated: {parameter.deprecated}
          </p>
        )}

        {parameter.children?.map((child, i) => (
          <div key={child.type ?? i} className="mt-3">
            <ParametersBox {...child} isNested />
          </div>
        ))}
      </dd>
    </div>
  );
};

const ParametersBox: FC<
  ParametersTableProps & { isNested?: boolean | undefined }
> = ({ type, parameters, isNested }) => {
  return (
    <div
      className={cn(
        "border-border/60 overflow-hidden rounded-lg border",
        isNested && "border-border/40",
      )}
    >
      {type && !isNested && (
        <div className="border-border/60 bg-muted/50 border-b px-4 py-2">
          <code className="text-muted-foreground font-mono text-xs font-medium">
            {type}
          </code>
        </div>
      )}
      <dl>
        {parameters.map((parameter) => (
          <Parameter
            key={parameter.name}
            parameter={parameter}
            isNested={isNested}
          />
        ))}
      </dl>
    </div>
  );
};

export type ParametersTableProps = {
  type?: string | undefined;
  parameters: Array<ParameterDef>;
};

export const ParametersTable: FC<ParametersTableProps> = ({
  type,
  parameters,
}) => {
  return (
    <div className="not-prose my-4">
      <ParametersBox type={type} parameters={parameters} />
    </div>
  );
};

// Shared bullet-list renderer for both ParametersTable and PrimitivesTypeTable
// in LLM/markdown output. `normalizeType` is the only behavioral difference
// between the two: PrimitivesTypeTable strips a trailing `| undefined`.
export type DefLLM = {
  name: string;
  type?: string;
  description?: string | ReactNode;
  required?: boolean;
  default?: string;
  deprecated?: string;
  children?: Array<{ parameters: DefLLM[] }>;
};

type DefListLLMProps = {
  defs: DefLLM[];
  commonParams?: Record<string, Partial<DefLLM>> | undefined;
  normalizeType?: ((type: string) => string) | undefined;
};

export const DefListLLM: FC<DefListLLMProps> = ({
  defs,
  commonParams,
  normalizeType,
}) => {
  return (
    <ul>
      {defs.map((def) => (
        <DefItemLLM
          key={def.name}
          def={def}
          commonParams={commonParams}
          normalizeType={normalizeType}
        />
      ))}
    </ul>
  );
};

const DefItemLLM: FC<
  { def: DefLLM } & Pick<DefListLLMProps, "commonParams" | "normalizeType">
> = ({ def: rawDef, commonParams, normalizeType }) => {
  const def = { ...commonParams?.[rawDef.name], ...rawDef };
  const isOptional = !def.required && !def.default;
  const type = def.type && normalizeType ? normalizeType(def.type) : def.type;

  return (
    <li>
      <code>
        {def.name}
        {isOptional ? "?" : ""}
      </code>
      {type ? (
        <>
          {": "}
          <code>{type}</code>
        </>
      ) : null}
      {def.default ? (
        <>
          {" (default "}
          <code>{def.default}</code>
          {")"}
        </>
      ) : null}
      {def.deprecated ? <> (deprecated: {def.deprecated})</> : null}
      {def.description ? <> — {renderDescription(def.description)}</> : null}
      {def.children?.map((child, i) => (
        <DefListLLM
          key={i}
          defs={child.parameters}
          commonParams={commonParams}
          normalizeType={normalizeType}
        />
      ))}
    </li>
  );
};

export const ParametersTableLLM: FC<ParametersTableProps> = ({
  parameters,
}) => {
  return <DefListLLM defs={parameters} commonParams={COMMON_PARAMS} />;
};
