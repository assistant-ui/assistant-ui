import Link from "next/link";
import { Fragment, type FC, type ReactNode } from "react";
import {
  Definition,
  DefinitionAnnotation,
  DefinitionDetails,
  DefinitionList,
  DefinitionName,
  DefinitionTerm,
} from "@/components/ui/definition-list";
import {
  COMMON_PARAMS,
  DESCRIPTION_LINK_CLASSNAME,
  DeprecatedNotice,
  getParameterAnnotations,
} from "./parameter-annotations";

type ParameterDef = {
  name: string;
  type?: string;
  description: string | ReactNode;
  required?: boolean;
  default?: string;
  deprecated?: string;
  experimental?: boolean;
  children?: Array<ParametersTableProps>;
};

// Groups: 1-2 code span (matching backtick runs), 3-4 link, 5 strong, 6-7 emphasis.
const INLINE_MARKDOWN_REGEX =
  /(`+)(?!`)([\s\S]*?[^`])\1(?!`)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(?=\S)([\s\S]*?\S)\*\*|(?<![\w*])([*_])(?![\s*_])([\s\S]*?[^\s*_])\6(?![\w*])/g;

const SAFE_HREF_REGEX = /^(?:\/|#|https?:|mailto:)/;

function renderInlineMarkdown(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(INLINE_MARKDOWN_REGEX)) {
    const index = match.index;
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    lastIndex = index + match[0].length;

    const [, , code, label, href, strong, , emphasis] = match;
    if (code !== undefined) {
      parts.push(<code key={index}>{code}</code>);
    } else if (label !== undefined && href !== undefined) {
      const children = renderInlineMarkdown(label);
      parts.push(
        !SAFE_HREF_REGEX.test(href) ? (
          <Fragment key={index}>{children}</Fragment>
        ) : href.startsWith("/") ? (
          <Link key={index} className={DESCRIPTION_LINK_CLASSNAME} href={href}>
            {children}
          </Link>
        ) : (
          <a key={index} className={DESCRIPTION_LINK_CLASSNAME} href={href}>
            {children}
          </a>
        ),
      );
    } else if (strong !== undefined) {
      parts.push(<strong key={index}>{renderInlineMarkdown(strong)}</strong>);
    } else if (emphasis !== undefined) {
      parts.push(<em key={index}>{renderInlineMarkdown(emphasis)}</em>);
    }
  }

  if (lastIndex === 0) return text;
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

/**
 * Renders the inline markdown JSDoc descriptions carry (code spans, links,
 * strong, emphasis) as React elements; everything else, HTML included, stays
 * escaped text.
 */
export function renderDescription(description: string | ReactNode): ReactNode {
  if (typeof description !== "string") return description;
  return renderInlineMarkdown(description);
}

const Parameter: FC<{ parameter: ParameterDef }> = ({
  parameter: partialParameter,
}) => {
  const parameter = {
    ...COMMON_PARAMS.parameters[partialParameter.name],
    ...partialParameter,
  };

  const isOptional = !parameter.required && !parameter.default;

  return (
    <Definition>
      <DefinitionTerm>
        <DefinitionName>
          {parameter.name}
          {isOptional && "?"}
        </DefinitionName>
        {parameter.type && (
          <DefinitionAnnotation>{parameter.type}</DefinitionAnnotation>
        )}
        {parameter.default && (
          <DefinitionAnnotation>= {parameter.default}</DefinitionAnnotation>
        )}
        {getParameterAnnotations(parameter, "term")}
      </DefinitionTerm>
      <DefinitionDetails>
        <p className="whitespace-pre-line">
          {renderDescription(parameter.description)}
        </p>

        <DeprecatedNotice deprecated={parameter.deprecated} />

        {parameter.children?.map((child, i) => (
          <ParametersGroup key={child.type ?? i} {...child} />
        ))}
      </DefinitionDetails>
    </Definition>
  );
};

const ParametersGroup: FC<ParametersTableProps> = ({ type, parameters }) => {
  return (
    <div className="border-foreground/10 mt-3 border-s ps-4">
      {type && (
        <div className="text-muted-foreground mb-2 font-mono text-xs font-medium [overflow-wrap:anywhere]">
          {type}
        </div>
      )}
      <DefinitionList className="border-t-0 [&>div:last-child]:border-b-0 [&>div:last-child]:pb-0">
        {parameters.map((parameter) => (
          <Parameter key={parameter.name} parameter={parameter} />
        ))}
      </DefinitionList>
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
    <div className="not-prose my-6">
      {type && (
        <div className="text-muted-foreground mb-2 font-mono text-xs font-medium [overflow-wrap:anywhere]">
          {type}
        </div>
      )}
      <DefinitionList>
        {parameters.map((parameter) => (
          <Parameter key={parameter.name} parameter={parameter} />
        ))}
      </DefinitionList>
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
  experimental?: boolean;
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
      {def.experimental ? <> (experimental)</> : null}
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
  return (
    <DefListLLM defs={parameters} commonParams={COMMON_PARAMS.parameters} />
  );
};
