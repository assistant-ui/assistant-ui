import { Plugin } from "vite";

interface AuiOptions {
  backendless?: boolean;
}

declare function aui(options?: AuiOptions): Plugin[];

declare namespace entry_root_exports {
  export { AuiOptions, aui };
}

export { entry_root_exports as entry_root };
