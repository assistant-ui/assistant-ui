import {
  Project,
  Node,
  InterfaceDeclaration,
  TypeAliasDeclaration,
} from "ts-morph";
import * as fs from "node:fs";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

// Add the source file
const sourceFile = project.addSourceFileAtPath(
  "./content/types-to-generate/typeDocs.ts",
);

const types: { [key: string]: any } = {};
sourceFile.getExportedDeclarations().forEach((declarations, name) => {
  declarations.forEach((declaration) => {
    // Resolve the actual declaration if it's an alias
    declaration = resolveAliasedDeclaration(declaration);

    // Process interfaces and types
    if (
      Node.isInterfaceDeclaration(declaration) ||
      Node.isTypeAliasDeclaration(declaration)
    ) {
      const typeInfo = processTypeOrInterface(declaration, name);
      types[name] = typeInfo;
    }
  });
});

const typesSrc = Object.entries(types)
  .map(([name, type]) => {
    return `export const ${name} = ${JSON.stringify(type, null, 2)};\n`;
  })
  .join("\n");

fs.mkdirSync("./generated", { recursive: true });
fs.writeFileSync("./generated/typeDocs.ts", typesSrc);

// Function to resolve aliased declarations
function resolveAliasedDeclaration(declaration: any) {
  if (Node.isExportSpecifier(declaration)) {
    const symbol = declaration.getSymbol();
    if (symbol) {
      const aliasedSymbol = symbol.getAliasedSymbol();
      if (aliasedSymbol) {
        const declarations = aliasedSymbol.getDeclarations();
        if (declarations.length > 0) {
          return declarations[0];
        }
      }
    }
  }
  return declaration;
}

// Function to process type or interface
function processTypeOrInterface(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
  typeName: string,
) {
  const type = declaration.getType();
  const properties = getPropertiesFromType(type);

  return {
    type: typeName,
    parameters: properties,
  };
}

function getPropertiesFromType(type: any) {
  const properties = type.getProperties();

  return properties.map((prop: any) => {
    const declarations = prop.getDeclarations();
    const decl = declarations[0];
    const propType = prop.getTypeAtLocation(decl).getText();
    const cleanType = cleanTypeText(propType);
    const jsDocs = decl.getJsDocs();
    const description = jsDocs.map((doc: any) => doc.getComment()).join("\n");
    const required = !decl.hasQuestionToken();
    const param: any = {
      name: prop.getName(),
      type: cleanType,
    };

    if (required) {
      param.required = true;
    }

    if (description) {
      param.description = description;
    }

    return param;
  });
}

function cleanTypeText(typeText: string): string {
  return typeText.replace(/import\(".*?"\)\./g, "");
}
