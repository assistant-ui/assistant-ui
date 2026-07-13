import { Plugin } from "vite";

declare function aui(): Plugin[];

declare namespace entry_root_exports {
  export { aui };
}

export { entry_root_exports as entry_root };
