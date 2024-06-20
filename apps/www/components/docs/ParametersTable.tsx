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
    <div
      className={`flex flex-col gap-1 px-3 py-3${!isLast ? " border-b" : ""}`}
    >
      <div className="relative flex gap-2">
        <h3 className="font-mono font-semibold text-sm">
          {parameter.name}
          {!parameter.required && "?"}:
        </h3>
        <div className="no-scrollbar w-full overflow-x-scroll text-nowrap pr-12 font-mono text-foreground/70 text-sm">
          {parameter.type}
        </div>
        <div className="pointer-events-none absolute top-0 right-0 h-5 w-12 bg-gradient-to-r from-white/0 to-background/100" />
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
}: { parameters: Array<ParameterDef> }) => {
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
    <div className="relative m-2 mb-0 flex flex-col rounded-lg border">
      {!!type && (
        <h3 className="-translate-y-1/2 absolute right-3 z-10 rounded-md border bg-background px-4 py-2 font-mono font-semibold text-foreground/70 text-xs">
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
