import { cn } from "@/lib/utils";
import Link from "next/link";
import type { FC, ReactNode } from "react";

type ParameterDef = {
  name: string;
  type?: string;
  description: string | ReactNode;
  required?: boolean;
  default?: string;
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
    <div
      className={cn(
        "group flex flex-col gap-2 border-border/50 border-b px-4 py-3 last:border-b-0",
        isNested && "bg-muted/30",
      )}
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <code className="font-mono font-semibold text-foreground text-sm">
          {parameter.name}
        </code>
        {parameter.required && (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-medium text-red-600 text-xs dark:text-red-400">
            required
          </span>
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

      <p className="text-muted-foreground text-sm leading-relaxed">
        {parameter.description}
      </p>

      {parameter.children?.map((child) => (
        <div key={child.type} className="mt-2">
          <ParametersBox {...child} isNested />
        </div>
      ))}
    </div>
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
      {type && (
        <div
          className={cn(
            "border-border/60 border-b bg-muted/50 px-4 py-2",
            isNested && "border-border/40 bg-muted/30",
          )}
        >
          <code className="font-medium font-mono text-muted-foreground text-xs">
            {type}
          </code>
        </div>
      )}
      <div>
        {parameters.map((parameter) => (
          <Parameter
            key={parameter.name}
            parameter={parameter}
            isNested={isNested}
          />
        ))}
      </div>
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
