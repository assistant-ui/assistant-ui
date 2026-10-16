export function getMcpToolName(serverId: string, toolName: string): string {
  const name = `${serverId}__${toolName}`;
  if (name.length <= 64 && !/[^a-zA-Z0-9_-]/.test(name)) return name;

  const identity = JSON.stringify([serverId, toolName]);
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < identity.length; index++) {
    hash = BigInt.asUintN(
      64,
      (hash ^ BigInt(identity.charCodeAt(index))) * 0x100000001b3n,
    );
  }

  // Server ids cannot contain `__`, so aliases cannot shadow an unchanged name.
  const prefix = `__mcp_${hash.toString(16).padStart(16, "0")}_`;
  return (
    prefix +
    toolName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64 - prefix.length)
  );
}
