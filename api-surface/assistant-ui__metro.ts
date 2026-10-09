declare const BACKENDLESS_ENV = "AUI_METRO_BACKENDLESS";

type BabelTransformer = {
  transform: (props: {
    filename: string;
    src: string;
    options?: {
      customTransformOptions?: {
        environment?: string;
      } | undefined;
    } | undefined;
    [key: string]: unknown;
  }) => unknown;
  getCacheKey?: (() => string) | undefined;
  [key: string]: unknown;
};

type MetroConfigLike = {
  aui?: WithAuiOptions | undefined;
  transformer?: {
    babelTransformerPath?: string | undefined;
    [key: string]: unknown;
  } | undefined;
  [key: string]: unknown;
};

declare const UPSTREAM_TRANSFORMER_ENV = "AUI_METRO_UPSTREAM_TRANSFORMER";

interface WithAuiOptions {
  backendless?: boolean;
}

declare function getCacheKey(): string;

declare namespace entry_root_exports {
  export { BACKENDLESS_ENV, MetroConfigLike, UPSTREAM_TRANSFORMER_ENV, WithAuiOptions, withAui };
}

declare function transform(props: Parameters<BabelTransformer["transform"]>[0]): unknown;

declare namespace entry_transformer_exports {
  export { getCacheKey, transform };
}

declare function withAui<T extends MetroConfigLike>(config: T): T;

export { entry_root_exports as entry_root, entry_transformer_exports as entry_transformer };
