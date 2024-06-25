import { cn } from "@/lib/utils";
import type { FC, ReactNode } from "react";

type ParameterDef = {
  name: string;
  type?: string;
  description: string | ReactNode;
  required?: boolean;
  default?: string;
  children?: Array<ParametersTableProps>;
};

type ParameterProps = {
  parameter: ParameterDef;
  isLast: boolean;
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
        <a
          className="font-semibold underline"
          href="/reference/primitives/composition"
        >
          Composition
        </a>{" "}
        guide for more details.
      </>
    ),
  },
};

const Parameter: FC<ParameterProps> = ({
  parameter: partialParameter,
  isLast,
}) => {
  const parameter = {
    ...COMMON_PARAMS[partialParameter.name],
    ...partialParameter,
  };

  return (
    <div className={cn("flex flex-col gap-1 px-3 py-3", !isLast && "border-b")}>
      <div className="relative flex gap-2">
        <h3 className="font-mono text-sm font-semibold">
          {parameter.name}
          {!parameter.required && !parameter.default && "?"}
          {!!parameter.type && ":"}
        </h3>
        <div className="no-scrollbar text-foreground/70 w-full overflow-x-scroll text-nowrap pr-12 font-mono text-sm">
          {parameter.type}
          {parameter.default && ` = ${parameter.default}`}
        </div>
        <div className="to-background/100 pointer-events-none absolute right-0 top-0 h-5 w-12 bg-gradient-to-r from-white/0" />
      </div>
      <div>
        <p className="text-foreground/70 text-sm">{parameter.description}</p>
      </div>
      {parameter.children?.map((property) => (
        <ParametersBox key={property.type} {...property} />
      ))}
    </div>
  );
};

const ParametersList = ({
  parameters,
}: {
  parameters: Array<ParameterDef>;
}) => {
  return parameters.map((parameter, idx) => (
    <Parameter
      key={parameter.name}
      parameter={parameter}
      isLast={idx === parameters.length - 1}
    />
  ));
};
const ParametersBox: FC<ParametersTableProps> = ({ type, parameters }) => {
  return (
    <div className="relative m-2 mb-1 flex flex-col rounded-lg border">
      {!!type && (
        <h3 className="bg-background text-foreground/70 absolute right-3 z-10 -translate-y-1/2 rounded-md border px-4 py-2 font-mono text-xs font-semibold">
          {type}
        </h3>
      )}
      <ParametersList parameters={parameters} />
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
    <div className={cn("-mx-2 mt-4", type && "mt-6")}>
      <ParametersBox type={type} parameters={parameters} />
    </div>
  );
};
