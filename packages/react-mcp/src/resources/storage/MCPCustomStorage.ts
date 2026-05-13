import { resource } from "@assistant-ui/tap";
import type { MCPStorage } from "./types";

export const MCPCustomStorage = resource(
  (impl: MCPStorage): MCPStorage => impl,
);
