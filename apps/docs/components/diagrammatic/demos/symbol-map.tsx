import { SymbolMap } from "diagrammatic";

export function SymbolMapDemo() {
  return (
    <SymbolMap
      title="Points of presence"
      marks={[
        { col: 4, row: 1, value: 42, label: "west-1" },
        { col: 7, row: 3, value: 22 },
        { col: 3, row: 4, value: 12 },
        { col: 13, row: 2, value: 16, label: "east-2" },
        { col: 14, row: 3, value: 7 },
        { col: 5, row: 6, value: 6 },
        { col: 11, row: 6, value: 4 },
      ]}
      legendLabel="circle = capacity"
    />
  );
}
