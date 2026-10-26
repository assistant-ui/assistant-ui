import { react18 } from "@assistant-ui/x-react18/vitest";
import { configDefaults, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

export default mergeConfig(mergeConfig(baseConfig, react18()), {
  test: {
    // Ink 6 and later declare a react >=19 peer, so the Ink renderer has no React 18 surface to test.
    exclude: [...configDefaults.exclude, "src/ink/**"],
  },
});
