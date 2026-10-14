import { ReactNode } from "react";

type AllowedHosts = readonly string[] | true;

type DevServer = {
  config: {
    root: string;
    server?: {
      allowedHosts?: readonly string[] | true | undefined;
    };
  };
  middlewares: {
    use: (path: string, handler: (request: IncomingRequest, response: OutgoingResponse, next: () => void) => void) => unknown;
  };
};

declare const GET: (request: Request) => Promise<Response>, POST: (request: Request) => Promise<Response>, DELETE: (request: Request) => Promise<Response>;

type GroupSelection = {
  id: string;
  label: string;
  kept: VariantChoice;
  removed: VariantChoice[];
  parent: {
    group: string;
    variant: string;
  } | undefined;
};

type IncomingRequest = AsyncIterable<Uint8Array | string> & {
  method?: string | undefined;
  url?: string | undefined;
  headers: Record<string, string | string[] | undefined>;
};

declare const NOTES_PATH = "/__variants";

type OutgoingResponse = {
  statusCode: number;
  setHeader: (name: string, value: string) => unknown;
  end: (body?: string) => unknown;
};

type SelectionNote = {
  group: string;
  variant: string | undefined;
  note: string;
  hint: string | undefined;
};

declare function Variant(_param0: VariantProps): import("react").JSX.Element;

type VariantChoice = {
  id: string;
  label: string;
};

type VariantProps = {
  id: string;
  label?: string | undefined;
  children?: ReactNode;
};

declare function Variants(_param1: VariantsProps): import("react").JSX.Element;

type VariantsConfig = {
  prompt?: ((selection: VariantsSelection) => string) | undefined;
  shortcut?: VariantsShortcut | false | undefined;
};

type VariantsPluginOptions = {
  root?: string | undefined;
  allowedHosts?: AllowedHosts | undefined;
};

type VariantsProps = {
  id: string;
  label?: string | undefined;
  default?: string | undefined;
  persist?: boolean | undefined;
  allowInProduction?: boolean | undefined;
  outline?: boolean | undefined;
  children?: ReactNode;
};

type VariantsRouteOptions = {
  allowedHosts?: AllowedHosts | undefined;
};

type VariantsSelection = {
  scope: "group" | "page";
  pathname: string;
  url: string;
  groups: GroupSelection[];
  notes: SelectionNote[];
};

type VariantsShortcut = {
  code: string;
  alt?: boolean | undefined;
  ctrl?: boolean | undefined;
  meta?: boolean | undefined;
  shift?: boolean | undefined;
};

declare function configureVariants(next: VariantsConfig): void;

declare const createVariantsRoutes: (options?: VariantsRouteOptions) => {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
  DELETE: (request: Request) => Promise<Response>;
};

declare function formatVariantsPrompt(selection: VariantsSelection): string;

declare namespace entry_root_exports {
  export { GroupSelection, SelectionNote, Variant, VariantChoice, VariantProps, Variants, VariantsConfig, VariantsProps, VariantsSelection, VariantsShortcut, configureVariants, formatVariantsPrompt };
}

declare namespace entry_next_exports {
  export { DELETE, GET, POST, VariantsRouteOptions, createVariantsRoutes };
}

declare function variants(options?: VariantsPluginOptions): {
  name: string;
  apply: "serve";
  configureServer(server: DevServer): void;
};

declare namespace entry_vite_exports {
  export { NOTES_PATH, VariantsPluginOptions, variants };
}

export { entry_next_exports as entry_next, entry_root_exports as entry_root, entry_vite_exports as entry_vite };
