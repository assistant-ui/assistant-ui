type StringState = { inString: boolean; stringChar: string };

function updateStringState(
  state: StringState,
  char: string,
  prevChar: string,
): boolean {
  if (state.inString) {
    if (char === state.stringChar && prevChar !== "\\") {
      state.inString = false;
    }
    return true;
  }
  if (char === '"' || char === "'" || char === "`") {
    state.inString = true;
    state.stringChar = char;
    return true;
  }
  return false;
}

function findMatchingParen(source: string, startIndex: number): number {
  const state: StringState = { inString: false, stringChar: "" };
  let parenCount = 0;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]!;
    const prevChar = source[i - 1] ?? "";
    if (updateStringState(state, char, prevChar)) continue;

    if (char === "(") parenCount++;
    if (char === ")") {
      if (parenCount === 0) {
        const endIndex = i + 1;
        return source[endIndex] === ";" ? endIndex + 1 : endIndex;
      }
      parenCount--;
    }
  }
  return -1;
}

// A semicolon in JSX text, from an HTML entity or ordinary prose, sits at zero
// nesting too, so the statement boundary is the one that also ends its line.
function findStatementEnd(source: string, startIndex: number): number {
  const state: StringState = { inString: false, stringChar: "" };
  let parenCount = 0;
  let braceCount = 0;
  let bracketCount = 0;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]!;
    const prevChar = source[i - 1] ?? "";
    if (updateStringState(state, char, prevChar)) continue;

    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (char === "{") braceCount++;
    if (char === "}") braceCount--;
    if (char === "[") bracketCount++;
    if (char === "]") bracketCount--;

    // A negative depth means the scan lost sync with the source; running on
    // would absorb the next declaration.
    if (parenCount < 0 || braceCount < 0 || bracketCount < 0) return -1;

    if (
      char === ";" &&
      parenCount === 0 &&
      braceCount === 0 &&
      bracketCount === 0 &&
      endsLine(source, i + 1)
    ) {
      return i + 1;
    }
  }

  return -1;
}

function endsLine(source: string, index: number): boolean {
  const lineEnd = source.indexOf("\n", index);
  const rest =
    lineEnd === -1 ? source.slice(index) : source.slice(index, lineEnd);
  return rest.trim() === "";
}

function findMatchingBrace(source: string, startIndex: number): number {
  const state: StringState = { inString: false, stringChar: "" };
  let braceCount = 0;
  let foundFirstBrace = false;

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]!;
    const prevChar = source[i - 1] ?? "";
    if (updateStringState(state, char, prevChar)) continue;

    if (char === "{") {
      braceCount++;
      foundFirstBrace = true;
    }
    if (char === "}") {
      braceCount--;
      if (foundFirstBrace && braceCount === 0) {
        return i + 1;
      }
    }
  }
  return -1;
}

export function extractFunctionCode(
  source: string,
  functionName: string,
): string {
  const functionRegex = new RegExp(
    `export\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*(?::[^{=]+)?\\{`,
  );
  const constRegex = new RegExp(
    `export\\s+const\\s+${functionName}\\s*(?::[^=]+)?=\\s*(?:function\\s*)?\\([^)]*\\)\\s*(?::[^{=]+)?(?:=>\\s*)?\\{?`,
  );

  let match = functionRegex.exec(source);
  let isArrowWithoutBrace = false;

  if (!match) {
    match = constRegex.exec(source);
    if (match && !match[0].endsWith("{")) {
      isArrowWithoutBrace = true;
    }
  }

  if (!match) {
    return `// Could not find function: ${functionName}`;
  }

  const startIndex = match.index;
  const searchStart = match.index + match[0].length;

  if (isArrowWithoutBrace) {
    const isWrapped = source[searchStart] === "(";
    const endIndex = isWrapped
      ? findMatchingParen(source, searchStart + 1)
      : findStatementEnd(source, searchStart);
    // A wrapping paren that closes mid-line covered only part of the body.
    if (endIndex === -1 || (isWrapped && !endsLine(source, endIndex))) {
      return `// Could not parse function: ${functionName}`;
    }
    return source.slice(startIndex, endIndex).trim();
  }

  const endIndex = findMatchingBrace(source, searchStart - 1);
  if (endIndex === -1) return `// Could not parse function: ${functionName}`;
  return source.slice(startIndex, endIndex).trim();
}

export function extractImports(source: string): string[] {
  const imports: string[] = [];
  const lines = source.split("\n");
  let currentImport = "";
  let inImport = false;

  const isImportComplete = (line: string): boolean =>
    (line.includes(" from ") && (line.includes('"') || line.includes("'"))) ||
    line.includes('"') ||
    line.includes("'");

  for (const line of lines) {
    if (line.trim().startsWith("import ")) {
      inImport = true;
      currentImport = line;
    } else if (inImport) {
      currentImport += `\n${line}`;
    }

    if (inImport && isImportComplete(line)) {
      imports.push(currentImport);
      currentImport = "";
      inImport = false;
    }
  }
  return imports;
}

// A specifier binds under its alias, and an inline type specifier binds under
// the name after the keyword.
function localBindingName(specifier: string): string {
  return specifier
    .replace(/^\s*type\s+/, "")
    .split(/\s+as\s+/)
    .pop()!
    .trim();
}

export function filterRelevantImports(
  imports: string[],
  code: string,
): string[] {
  const usesName = (name: string) => new RegExp(`\\b${name}\\b`).test(code);

  return imports.filter((imp) => {
    const namedMatch = imp.match(/import\s+(?:type\s+)?\{([^}]+)\}/);
    const defaultMatch = imp.match(/import\s+(\w+)\s+from/);

    if (namedMatch?.[1]) {
      const names = namedMatch[1]
        .split(",")
        .map((specifier) => localBindingName(specifier))
        .filter((name): name is string => Boolean(name));
      return names.some(usesName);
    }
    if (defaultMatch?.[1]) {
      return usesName(defaultMatch[1]);
    }
    return false;
  });
}

function dedentSampleFrameContent(code: string): string {
  const lines = code.split("\n");
  const result: string[] = [];
  let inSampleFrame = false;

  for (const line of lines) {
    if (line.includes("<SampleFrame")) {
      inSampleFrame = true;
      continue;
    }
    if (line.includes("</SampleFrame>")) {
      inSampleFrame = false;
      continue;
    }
    if (inSampleFrame && line.startsWith("  ")) {
      result.push(line.slice(2));
    } else {
      result.push(line);
    }
  }
  return result.join("\n");
}

export function cleanupCode(code: string): string {
  return dedentSampleFrameContent(code).replace(/^export\s+/, "");
}

export function cleanupImports(imports: string[]): string[] {
  return imports
    .filter((imp) => !imp.includes("SampleFrame"))
    .map((imp) =>
      imp.replace(
        /(@\/components\/[\w-]+(?:\/[\w.-]+)*\/[\w.-]+?)\.radix(["'])/g,
        "$1$2",
      ),
    );
}

export function extractUseClientDirective(source: string): string | undefined {
  return source.match(/^\s*(["'])use client\1;?/)?.[0].trim();
}
