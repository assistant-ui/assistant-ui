import type { GenerateOptions } from "fumadocs-typescript";
import type { Symbol, Type } from "ts-morph";

interface DocEntry {
  name: string;
  description: string;
  type: string;
  simplifiedType: string;
  tags: Array<{ name: string; text: string }>;
  required: boolean;
  deprecated: boolean;
}

const essentialProps = new Set(["className", "style", "children", "ref"]);

export const assistantUITransform: NonNullable<GenerateOptions["transform"]> = function (
  entry: DocEntry,
  propertyType: Type,
  propertySymbol: Symbol,
) {
  const symbol = propertySymbol || propertyType.getSymbol();
  if (!symbol) return;

  const declarations = symbol.getDeclarations();
  if (declarations.length === 0) return;

  const sourceFile = declarations[0]!.getSourceFile().getFilePath();

  if (sourceFile.includes("@assistant-ui/") || sourceFile.includes("@radix-ui/")) {
    return;
  }

  if (essentialProps.has(entry.name)) {
    return;
  }

  if (sourceFile.includes("@types/react") || sourceFile.includes("node_modules/typescript")) {
    (entry.tags as unknown as { internal?: boolean }).internal = true;
  }
};

const combineTransforms = (
  base: GenerateOptions["transform"] | undefined,
  extra: NonNullable<GenerateOptions["transform"]>,
): NonNullable<GenerateOptions["transform"]> => {
  if (!base) return extra;
  return function (entry, propertyType, propertySymbol) {
    base.call(this, entry, propertyType, propertySymbol);
    extra.call(this, entry, propertyType, propertySymbol);
  };
};

export const applyAssistantUITransform = (options?: GenerateOptions): GenerateOptions => ({
  ...options,
  transform: combineTransforms(options?.transform, assistantUITransform),
});
