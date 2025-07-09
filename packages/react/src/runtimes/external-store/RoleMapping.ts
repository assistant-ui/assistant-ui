export type RoleMapping = {
  [externalRole: string]: "user" | "assistant" | "system";
};

export const mapRole = (
  role: string,
  mapping?: RoleMapping,
): "user" | "assistant" | "system" => {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  if (mapping && role in mapping) {
    return mapping[role]!;
  }

  return "assistant";
};
