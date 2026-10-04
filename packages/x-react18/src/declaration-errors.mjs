const DIAGNOSTIC = /^(.+?)\(\d+,\d+\): error TS\d+:/;

// Declarations outside the package's own directory, in node_modules or in a workspace dependency resolved to its real path, belong to upstream packages.
const isUpstream = (file) =>
  file.includes("node_modules") || file.startsWith("../");

// Splits `tsc --pretty false` output into diagnostics in the package's own files and those in upstream declarations; continuation lines stay with the diagnostic above them.
export function splitDiagnostics(output) {
  const own = [];
  const upstream = [];
  let current = null;
  for (const line of output.split("\n")) {
    const match = DIAGNOSTIC.exec(line);
    if (match || line.startsWith("error TS")) {
      current = [line];
      (match && isUpstream(match[1]) ? upstream : own).push(current);
    } else if (current && line.trim() !== "") {
      current.push(line);
    }
  }
  return {
    own: own.map((lines) => lines.join("\n")),
    upstream: upstream.map((lines) => lines.join("\n")),
  };
}

// The same upstream error can sit at another version's path and line (e.g. @types/react 18 vs 19), so it is compared by package-relative file and message.
export function diagnosticKey(diagnostic) {
  const first = diagnostic.split("\n")[0];
  const match = /^(.+?)\(\d+,\d+\): (error TS\d+:.*)$/.exec(first);
  if (!match) return first;
  return `${match[1].split("node_modules/").at(-1)}: ${match[2]}`;
}

// Diagnostics in `react18` that don't appear in `react19`: the upstream errors that React 18's types introduce.
export function onlyInReact18(react18, react19) {
  const baseline = new Set(react19.map(diagnosticKey));
  return react18.filter(
    (diagnostic) => !baseline.has(diagnosticKey(diagnostic)),
  );
}
