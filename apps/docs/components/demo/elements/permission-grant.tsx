"use client";

import { useEffect, useState } from "react";
import {
  PermissionGrant,
  type GrantScope,
} from "@/components/assistant-ui/elements/permission-grant";

const REACH = [
  "Read and write files under the workspace",
  "Run commands you have already approved",
  "No network access",
];

export function PermissionGrantDemo() {
  const [scope, setScope] = useState<GrantScope | "pending">("pending");

  useEffect(() => {
    if (scope === "pending") return;
    const id = setTimeout(() => setScope("pending"), 2600);
    return () => clearTimeout(id);
  }, [scope]);

  return (
    <PermissionGrant
      capability="Filesystem access"
      requester="filesystem-mcp"
      reach={REACH}
      scope={scope}
      onGrant={setScope}
    />
  );
}
