export type SizeEntry = {
  subpath: string;
  file: string;
};

export type SizeMeasurement = {
  min: number;
  gzip: number;
};

export type SizeRow = {
  entry: string;
  base: number | null;
  head: number | null;
  delta: number;
  status: "same" | "moved" | "new" | "removed";
};

export type CompareSizesOptions = {
  root: string;
  ref: string;
  report?: string | undefined;
};

export declare const SIZE_IGNORE: Set<string>;
export declare const listEntries: (
  pkg: {
    exports?: unknown;
    module?: unknown;
    main?: unknown;
  },
  pkgDir: string,
) => SizeEntry[];
export declare const measureEntry: (file: string) => Promise<SizeMeasurement>;
export declare const measurePackages: (
  root: string,
  names: readonly string[],
) => Promise<Map<string, SizeMeasurement>>;
export declare const diffSizes: (
  base: ReadonlyMap<string, SizeMeasurement>,
  head: ReadonlyMap<string, SizeMeasurement>,
) => SizeRow[];
export declare const renderSizeReport: (
  rows: readonly SizeRow[],
  labels: { base: string; head: string },
) => string;
export declare const compareSizes: (
  options: CompareSizesOptions,
) => Promise<void>;
