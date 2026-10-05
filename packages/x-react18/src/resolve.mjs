const TARGETS = { react: "react-v18", "react-dom": "react-dom-v18" };

export function react18Specifier(specifier) {
  const match = /^(react|react-dom)(\/.*)?$/.exec(specifier);
  return match ? `${TARGETS[match[1]]}${match[2] ?? ""}` : null;
}
