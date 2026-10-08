const decodeSegments = (path: string): string[] =>
  path === ""
    ? []
    : path
        .split("/")
        .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));

export const decodeScopeRelativePointer = (path: string): string[] =>
  decodeSegments(path.startsWith("/") ? path.slice(1) : path);

export const decodeAbsolutePointer = (path: string): string[] | undefined =>
  path === "" || path.startsWith("/")
    ? decodeScopeRelativePointer(path)
    : undefined;
