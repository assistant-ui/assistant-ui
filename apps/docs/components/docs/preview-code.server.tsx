import fs from "node:fs";
import path from "node:path";
import { PreviewCodeClient } from "./preview-code";

type PreviewCodeProps = {
  /** Path relative to apps/docs, e.g. "components/docs/samples/select" */
  file: string;
  /** Function name to extract, e.g. "SelectScrollableSample" */
  name: string;
  children: React.ReactNode;
  className?: string;
};

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

function extractFunctionCode(source: string, functionName: string): string {
  const functionRegex = new RegExp(
    `export\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
  );
  const constRegex = new RegExp(
    `export\\s+const\\s+${functionName}\\s*=\\s*(?:function\\s*)?\\([^)]*\\)\\s*(?:=>\\s*)?\\{?`,
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
    const endIndex = findMatchingParen(source, searchStart);
    if (endIndex === -1) return `// Could not parse function: ${functionName}`;
    return source.slice(startIndex, endIndex).trim();
  }

  const endIndex = findMatchingBrace(source, searchStart - 1);
  if (endIndex === -1) return `// Could not parse function: ${functionName}`;
  return source.slice(startIndex, endIndex).trim();
}

function extractImports(source: string): string[] {
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

function filterRelevantImports(imports: string[], code: string): string[] {
  return imports.filter((imp) => {
    const namedMatch = imp.match(/import\s+\{([^}]+)\}/);
    const defaultMatch = imp.match(/import\s+(\w+)\s+from/);

    if (namedMatch?.[1]) {
      const names = namedMatch[1]
        .split(",")
        .map((n) => n.trim().split(" as ")[0]?.trim())
        .filter((name): name is string => Boolean(name));
      return names.some((name) => code.includes(name));
    }
    if (defaultMatch?.[1]) {
      return code.includes(defaultMatch[1]);
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

function cleanupCode(code: string): string {
  return dedentSampleFrameContent(code).replace(/^export\s+/, "");
}

function cleanupImports(imports: string[]): string[] {
  return imports
    .filter((imp) => !imp.includes("SampleFrame"))
    .map((imp) =>
      imp.replace(/@\/components\/assistant-ui\//g, "@/components/ui/"),
    );
}

export async function PreviewCode({
  file,
  name,
  children,
  className,
}: PreviewCodeProps) {
  const filePath = path.join(process.cwd(), `${file}.tsx`);

  let code: string;
  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const functionCode = extractFunctionCode(source, name);
    const cleanedCode = cleanupCode(functionCode);

    const allImports = extractImports(source);
    const relevantImports = filterRelevantImports(allImports, cleanedCode);
    const cleanedImports = cleanupImports(relevantImports);

    code =
      cleanedImports.length > 0
        ? `${cleanedImports.join("\n")}\n\n${cleanedCode}`
        : cleanedCode;
  } catch {
    code = `// Error reading file: ${file}`;
  }

  return (
    <PreviewCodeClient code={code} {...(className && { className })}>
      {children}
    </PreviewCodeClient>
  );
}
