import type { FC } from "react";

type ParameterDef = {
  name: string;
  type: string;
  description: string;
  isOptional?: boolean;
  children?: Array<{
    type: string;
    parameters: Array<ParameterDef>;
  }>;
};

type ParameterProps = {
  parameter: ParameterDef;
  isLast: boolean;
};

const Parameter: FC<ParameterProps> = ({ parameter, isLast }) => {
  return (
    <div
      className={`flex flex-col gap-1 px-3 py-3${!isLast ? " border-b" : ""}`}
    >
      <div className="relative flex gap-2">
        <h3 className="font-mono font-semibold text-sm">
          {parameter.name}
          {parameter.isOptional && "?"}:
        </h3>
        <div className="no-scrollbar w-full overflow-x-scroll text-nowrap pr-12 font-mono text-foreground/70 text-sm">
          {parameter.type}
        </div>
        <div className="pointer-events-none absolute top-0 right-0 h-5 w-12 bg-gradient-to-r from-white/0 to-white/100" />
      </div>
      <div>
        <p className="text-foreground/70 text-sm">{parameter.description}</p>
      </div>
      {parameter.children?.map((property) => (
        <div
          key={property.type}
          className="relative m-2 flex flex-col rounded-lg border px-3"
        >
          {!!property.type && (
            <h3 className="bg-secondary p-2 font-mono text-foreground/70 text-xs">
              {property.type}
            </h3>
          )}
          <ParametersTable parameters={property.parameters} />
        </div>
      ))}
    </div>
  );
};

type ParametersTableProps = {
  parameters: Array<ParameterDef>;
};

export const ParametersTable: FC<ParametersTableProps> = ({ parameters }) => {
  return (
    <div className="-mx-3">
      {parameters.map((parameter, idx) => (
        <Parameter
          key={parameter.name}
          parameter={parameter}
          isLast={idx === parameters.length - 1}
        />
      ))}
    </div>
  );
};
