import { transformAsync } from "@babel/core";
import type { Plugin, SourceMapInput } from "rolldown";

/**
 * Runs React Compiler over source files before rolldown's own TS transform.
 * Infer mode: only `use*`-named hooks and PascalCase components are compiled;
 * anonymous resource bodies are left alone. Compiled output allocates its memo
 * cache through `react/compiler-runtime`, which the `output.paths` remap routes
 * to `@assistant-ui/tap/react-shim/compiler-runtime` so it works inside tap
 * resource renders too. Babel only parses TS here (no transform), so the code
 * handed back to rolldown is still TS.
 */
export function reactCompiler(): Plugin {
  return {
    name: "react-compiler",
    transform: {
      filter: { id: { include: /\.tsx?$/, exclude: /\.d\.ts$/ } },
      async handler(code, id) {
        const result = await transformAsync(code, {
          filename: id,
          babelrc: false,
          configFile: false,
          browserslistConfigFile: false,
          parserOpts: {
            plugins: id.endsWith(".tsx")
              ? ["typescript", "jsx"]
              : ["typescript"],
          },
          plugins: ["babel-plugin-react-compiler"],
          sourceMaps: true,
        });
        if (result?.code == null) return null;
        return {
          code: result.code,
          // babel's optional `sourcesContent` doesn't satisfy rolldown's map
          // type under exactOptionalPropertyTypes; shapes are compatible.
          map: (result.map ?? null) as SourceMapInput,
        };
      },
    },
  };
}
