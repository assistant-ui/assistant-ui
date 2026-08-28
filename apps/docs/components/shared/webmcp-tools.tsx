"use client";

import { useEffect } from "react";
import { getWebMcpModelContext, registerWebMcpTools } from "@/lib/webmcp-tools";

export function WebMcpTools() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_WEBMCP_ENABLED !== "1") return;
    const modelContext = getWebMcpModelContext();
    if (!modelContext) return;
    return registerWebMcpTools(modelContext, (url, init) => fetch(url, init));
  }, []);

  return null;
}
