import type { Toolkit } from "./toolbox";

type KnownKeys<T> = {
  [K in keyof T]: string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K;
}[keyof T];

type ToolkitEntries<T> = Pick<T, KnownKeys<T>>;

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type MergeToolkitEntries<
  TToolkits extends readonly Toolkit[],
  TMerged = object,
> = TToolkits extends readonly [
  infer TFirst extends Toolkit,
  ...infer TRest extends readonly Toolkit[],
]
  ? MergeToolkitEntries<
      TRest,
      TMerged & Omit<ToolkitEntries<TFirst>, keyof TMerged>
    >
  : Simplify<TMerged>;

export type MergedToolkit<TToolkits extends readonly Toolkit[]> = Toolkit &
  MergeToolkitEntries<TToolkits>;

export function mergeToolkits<const TToolkits extends readonly Toolkit[]>(
  ...toolkits: TToolkits
): MergedToolkit<TToolkits> {
  const merged: Toolkit = {};
  const warned = new Set<string>();

  for (const toolkit of toolkits) {
    for (const [name, tool] of Object.entries(toolkit)) {
      if (Object.hasOwn(merged, name)) {
        if (!warned.has(name)) {
          console.warn(
            `[assistant-ui] Duplicate tool name "${name}" while merging toolkits. Keeping the first definition.`,
          );
          warned.add(name);
        }
        continue;
      }

      merged[name] = tool;
    }
  }

  return merged as MergedToolkit<TToolkits>;
}
