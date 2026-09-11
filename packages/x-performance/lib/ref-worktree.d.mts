export declare const ensureRefWorktree: (
  ref: string,
  options?: { build?: boolean },
) => {
  wt: string;
  sha: string;
  marker: string;
};

export declare const distFingerprint: (dir: string) => string | null;

export declare const changedPackages: (
  currentRoot: string,
  refRoot: string,
) => string[];
