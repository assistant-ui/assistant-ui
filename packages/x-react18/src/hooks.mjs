import { registerHooks } from "node:module";
import { react18Specifier } from "./resolve.mjs";

const parentURL = new URL("../package.json", import.meta.url).href;

// Node resolves every `require("react")` and bare `import "react"` outside vite, including inside react-dom and third-party libraries, so they all get React 18.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = react18Specifier(specifier);
    return target
      ? nextResolve(target, { ...context, parentURL })
      : nextResolve(specifier, context);
  },
});
