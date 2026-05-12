import { cn } from "@/lib/utils";
import Link from "next/link";
import type { FC, ReactNode } from "react";
import { StatusBadge } from "./status-badge";

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
          className="font-medium text-foreground underline underline-offset-2"
          href="/docs/api-reference/primitives/composition"
        >
          Composition
        </Link>{" "}
        guide for more details.
      </>
    ),
  },
};

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
    <tr
      className={cn(
        "group block border-border/50 border-b px-4 py-3 last:border-b-0",
        isNested && "bg-muted/30",
      )}
    >
      <th
        scope="row"
        className="block p-0 text-left align-baseline font-normal"
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <code className="font-mono font-semibold text-foreground text-sm">
            {parameter.name}
          </code>
          {parameter.deprecated && <StatusBadge variant="deprecated" />}
          {parameter.name.startsWith("unstable_") && (
            <StatusBadge variant="unstable" />
          )}
          {parameter.type && (
            <code className="font-mono text-muted-foreground text-xs">
              {isOptional && "?"}
              {": "}
              {parameter.type}
            </code>
          )}
          {parameter.default && (
            <span className="font-mono text-muted-foreground text-xs">
              = {parameter.default}
            </span>
          )}
        </div>
      </th>
      <td className="block p-0 pt-2 align-baseline">
        <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
          {parameter.description}
        </p>

        {parameter.deprecated && (
          <p className="mt-2 text-amber-600 text-xs dark:text-amber-400">
            Deprecated: {parameter.deprecated}
          </p>
        )}

        {parameter.children?.map((child, i) => (
          <div key={child.type ?? i} className="mt-3">
            <ParametersBox {...child} isNested />
          </div>
        ))}
      </td>
    </tr>
  );
};

const ParametersBox: FC<
  ParametersTableProps & { isNested?: boolean | undefined }
> = ({ type, parameters, isNested }) => {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/60",
        isNested && "border-border/40",
      )}
    >
      <table className="block w-full text-left">
        {type && !isNested && (
          <caption className="block border-border/60 border-b bg-muted/50 px-4 py-2 text-left">
            <code className="font-medium font-mono text-muted-foreground text-xs">
              {type}
            </code>
          </caption>
        )}
        <thead className="sr-only">
          <tr>
            <th scope="col">Parameter</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody className="block">
          {parameters.map((parameter) => (
            <Parameter
              key={parameter.name}
              parameter={parameter}
              isNested={isNested}
            />
          ))}
        </tbody>
      </table>
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
