interface WithAuiOptions {
  rules?: string[];
}

type NextConfigLike = {
  turbopack?: {
    rules?: Record<string, unknown>;
  } | undefined;
  webpack?: ((config: any, context: any) => any) | null | undefined;
};

declare function withAui<T extends NextConfigLike>(nextConfig?: T, options?: WithAuiOptions): T;

declare namespace index_d_exports {
  export { WithAuiOptions, withAui };
}

declare namespace loader_d_exports {
  export { generativeLoader as default };
}

interface GenerativeLoaderContext {
  resourcePath?: string;
  resourceQuery?: string;
  sourceMap?: boolean;
  getOptions?(): {
    path?: string;
  } | undefined;
  async(): (err: unknown, code?: string, map?: object | null) => void;
}

declare function generativeLoader(this: GenerativeLoaderContext, source: string): void;

export { index_d_exports as entry_0_root, loader_d_exports as entry_1_loader };
