import { cn } from "@/lib/utils";
import type { FC } from "react";

type ParameterDef = {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  children?: Array<ParametersTableProps>;
};

type ParameterProps = {
  parameter: ParameterDef;
  isLast: boolean;
};

const Parameter: FC<ParameterProps> = ({ parameter, isLast }) => {
  return (
    <div className={cn("flex flex-col gap-1 px-3 py-3", !isLast && "border-b")}>
      <div className="relative flex gap-2">
        <h3 className="font-mono text-sm font-semibold">
          {parameter.name}
          {!parameter.required && "?"}:
        </h3>
        <div className="no-scrollbar text-foreground/70 w-full overflow-x-scroll text-nowrap pr-12 font-mono text-sm">
          {parameter.type}
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

type ParametersTableProps = {
  type?: string;
  parameters: Array<ParameterDef>;
};

export const ParametersTable: FC<ParametersTableProps> = ({
  type,
  parameters,
}) => {
  return (
    <div className="-mx-3">
      {type ? (
        <ParametersBox type={type} parameters={parameters} />
      ) : (
        <ParametersList parameters={parameters} />
      )}
    </div>
  );
};
