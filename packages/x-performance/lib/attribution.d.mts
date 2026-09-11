export declare const importedPackages: (source: string) => Set<string>;

export declare const workspaceGraph: (root: string) => Map<string, string[]>;

export declare const closure: (
  names: Iterable<string>,
  graph: Map<string, string[]>,
) => Set<string>;

export declare const benchCoverage: (
  benchDir: string,
  graph: Map<string, string[]>,
) => Map<string, Set<string>>;

export declare const benchFileOf: (rowId: string) => string;

export declare const attributeRows: <T extends { id: string }>(
  rows: T[],
  coverage: Map<string, Set<string>>,
  changed: string[],
) => (T & { measured: boolean; touched: string[] })[];
