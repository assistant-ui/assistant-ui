"use client";

import { useEffect } from "react";
import { getWebMcpModelContext, registerWebMcpTools } from "@/lib/webmcp-tools";

export function WebMcpTools() {
  useEffect(() => {
    const modelContext = getWebMcpModelContext();
    if (!modelContext) return;
    return registerWebMcpTools(modelContext, (url, init) => fetch(url, init));
  }, []);

  return null;
}
