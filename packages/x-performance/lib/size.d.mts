export type SizeEntry = {
  subpath: string;
  file: string;
};

export type SizeMeasurement = {
  min: number;
  gzip: number;
};

export type SizeBudget = SizeMeasurement;

export type SizeStatus = "new" | "over" | "under" | "ok";

export type SizeRow = {
  package: string;
  subpath: string;
  min: number | null;
  gzip: number | null;
  budget: SizeBudget | null;
  status: SizeStatus | "skipped (not built)" | "stale";
};

export type CheckSizesOptions = {
  repoRoot: string;
  budgetsPath: string;
  update?: boolean;
  json?: string | undefined;
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
export declare const budgetStatus: (
  budget: SizeBudget | undefined,
  actual: SizeMeasurement,
) => SizeStatus;
export declare const checkSizes: (
  options: CheckSizesOptions,
) => Promise<boolean>;
