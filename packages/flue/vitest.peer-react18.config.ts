import { react18 } from "@assistant-ui/x-react18/vitest";
import { mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config.ts";

export default mergeConfig(baseConfig, react18());
