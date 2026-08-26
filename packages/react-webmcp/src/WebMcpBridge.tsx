"use client";

import type { FC } from "react";
import { useWebMcpBridge, type WebMcpBridgeOptions } from "./useWebMcpBridge";

export const WebMcpBridge: FC<WebMcpBridgeOptions> = (props) => {
  useWebMcpBridge(props);
  return null;
};
