declare namespace index_d_exports {
  export { MetroConfigLike, UPSTREAM_TRANSFORMER_ENV, withAui };
}

type MetroConfigLike = {
  transformer?: {
    babelTransformerPath?: string | undefined;
    [key: string]: unknown;
  } | undefined;
  [key: string]: unknown;
};

declare const UPSTREAM_TRANSFORMER_ENV = "AUI_METRO_UPSTREAM_TRANSFORMER";

declare function withAui<T extends MetroConfigLike>(config: T): T;

declare namespace transformer_d_exports {
  export { getCacheKey, transform };
}

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

declare function transform(props: Parameters<BabelTransformer["transform"]>[0]): unknown;

declare function getCacheKey(): string;

export { index_d_exports as entry_0_root, transformer_d_exports as entry_1_transformer };
