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

function extractFunctionCode(source: string, functionName: string): string {
  // Match export function FunctionName or export const FunctionName
  const functionRegex = new RegExp(
    `export\\s+function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
    "g",
  );
  const constRegex = new RegExp(
    `export\\s+const\\s+${functionName}\\s*=\\s*(?:function\\s*)?\\([^)]*\\)\\s*(?:=>\\s*)?\\{?`,
    "g",
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

  if (isArrowWithoutBrace) {
    // Arrow function without braces - find the end by matching parentheses
    let parenCount = 0;
    let inString = false;
    let stringChar = "";
    let endIndex = match.index + match[0].length;

    for (let i = endIndex; i < source.length; i++) {
      const char = source[i];
      const prevChar = source[i - 1];

      if (inString) {
        if (char === stringChar && prevChar !== "\\") {
          inString = false;
        }
        continue;
      }

      if (char === '"' || char === "'" || char === "`") {
        inString = true;
        stringChar = char;
        continue;
      }

      if (char === "(") parenCount++;
      if (char === ")") {
        if (parenCount === 0) {
          endIndex = i + 1;
          // Skip trailing semicolon
          if (source[endIndex] === ";") endIndex++;
          break;
        }
        parenCount--;
      }
    }

    return source.slice(startIndex, endIndex).trim();
  }

  // Function with braces - count braces to find the end
  let braceCount = 0;
  let inString = false;
  let stringChar = "";
  let foundFirstBrace = false;

  for (let i = match.index + match[0].length - 1; i < source.length; i++) {
    const char = source[i];
    const prevChar = source[i - 1];

    if (inString) {
      if (char === stringChar && prevChar !== "\\") {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === "{") {
      braceCount++;
      foundFirstBrace = true;
    }
    if (char === "}") {
      braceCount--;
      if (foundFirstBrace && braceCount === 0) {
        return source.slice(startIndex, i + 1).trim();
      }
    }
  }

  return `// Could not parse function: ${functionName}`;
}

function extractImports(source: string): string[] {
  const imports: string[] = [];
  // Match both single-line and multi-line imports
  const lines = source.split("\n");
  let currentImport = "";
  let inImport = false;

  for (const line of lines) {
    if (line.trim().startsWith("import ")) {
      inImport = true;
      currentImport = line;
      if (
        line.includes(" from ") &&
        (line.includes('"') || line.includes("'"))
      ) {
        imports.push(currentImport);
        currentImport = "";
        inImport = false;
      }
    } else if (inImport) {
      currentImport += `\n${line}`;
      if (line.includes(" from ") || line.includes('"') || line.includes("'")) {
        imports.push(currentImport);
        currentImport = "";
        inImport = false;
      }
    }
  }
  return imports;
}

function filterRelevantImports(imports: string[], code: string): string[] {
  return imports.filter((imp) => {
    // Extract imported names from the import statement
    const namedMatch = imp.match(/import\s+\{([^}]+)\}/);
    const defaultMatch = imp.match(/import\s+(\w+)\s+from/);

    if (namedMatch) {
      const names = namedMatch[1]
        .split(",")
        .map((n) => n.trim().split(" as ")[0].trim());
      return names.some((name) => code.includes(name));
    }
    if (defaultMatch) {
      return code.includes(defaultMatch[1]);
    }
    return false;
  });
}

function cleanupCode(code: string): string {
  let result = code;

  // Remove SampleFrame wrapper entirely and dedent the content
  result = result.replace(/<SampleFrame[^>]*>\s*/g, "");
  result = result.replace(/\s*<\/SampleFrame>/g, "");

  // Remove "export " prefix
  result = result.replace(/^export\s+/, "");

  return result;
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
    <PreviewCodeClient code={code} className={className}>
      {children}
    </PreviewCodeClient>
  );
}
