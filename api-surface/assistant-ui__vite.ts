import { Plugin } from "vite";

declare namespace entry_root_exports {
  export { aui };
}

declare function aui(): Plugin[];

export { entry_root_exports as entry_root };
