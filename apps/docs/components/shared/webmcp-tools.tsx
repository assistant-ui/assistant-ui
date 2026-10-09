"use client";

import { useEffect } from "react";
import { isWebMcpEnabled } from "@/lib/feature-flags";
import { getWebMcpModelContext, registerWebMcpTools } from "@/lib/webmcp-tools";

export function WebMcpTools() {
  useEffect(() => {
    if (!isWebMcpEnabled) return;
    if (window.top !== window.self) return;
    const modelContext = getWebMcpModelContext();
    if (!modelContext) return;
    return registerWebMcpTools(modelContext, (url, init) => fetch(url, init));
  }, []);

  return null;
}
