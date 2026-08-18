interface GenerativeLoaderContext {
  resourcePath?: string;
  resourceQuery?: string;
  sourceMap?: boolean;
  getOptions?(): {
    path?: string;
    backendless?: boolean;
  } | undefined;
  async(): (err: unknown, code?: string, map?: object | null) => void;
}

type NextConfigLike = {
  aui?: WithAuiOptions | undefined;
  turbopack?: {
    rules?: Record<string, unknown>;
  } | undefined;
  webpack?: ((config: any, context: any) => any) | null | undefined;
};

interface WithAuiOptions {
  rules?: string[];
  backendless?: boolean;
}

declare function generativeLoader(this: GenerativeLoaderContext, source: string): void;

declare namespace entry_root_exports {
  export { WithAuiOptions, withAui };
}

declare namespace entry_loader_exports {
  export { generativeLoader as default };
}

declare function withAui<T extends NextConfigLike>(nextConfig?: T, options?: WithAuiOptions): T;

export { entry_loader_exports as entry_loader, entry_root_exports as entry_root };
