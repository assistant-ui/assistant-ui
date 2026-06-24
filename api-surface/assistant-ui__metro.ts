declare namespace entry_root_exports {
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

declare namespace entry_transformer_exports {
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

export { entry_root_exports as entry_root, entry_transformer_exports as entry_transformer };
