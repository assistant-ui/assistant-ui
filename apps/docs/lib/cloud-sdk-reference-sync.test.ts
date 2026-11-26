import { readFileSync } from "node:fs";
import path from "node:path";
import { Node, Project, Scope, type Symbol, type Type } from "ts-morph";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const PAGE = "apps/docs/content/docs/cloud/(reference)/sdk.mdx";

// Methods the page covers in prose instead of a table row.
const IN_PROSE = new Set(["cloud.registerSdk"]);

type Method = { name: string; fields: string[] };

const project = new Project({
  compilerOptions: { strict: true },
  skipAddingFilesFromTsConfig: true,
});
const source = project.addSourceFileAtPath(
  path.join(ROOT, "packages/cloud/src/AssistantCloud.ts"),
);
project.resolveSourceFileDependencies();
const client = source.getClassOrThrow("AssistantCloud");

const isHidden = (symbol: Symbol) =>
  symbol.getName().startsWith("_") ||
  symbol.getName().startsWith("#") ||
  symbol
    .getDeclarations()
    .some(
      (node) =>
        (Node.isScoped(node) && node.getScope() !== Scope.Public) ||
        (Node.isJSDocable(node) &&
          node
            .getJsDocs()
            .some((doc) =>
              doc.getTags().some((tag) => tag.getTagName() === "deprecated"),
            )),
    );

const CLIENT_SOURCE = path.join(ROOT, "packages/cloud/src");

// The property names a reader passes or gets back: the fields of object
// parameters and of the resolved return value, one level deep. Only shapes
// the client declares count; a returned stream or class is not a field list.
const fieldsOf = (type: Type): string[] => {
  if (type.isUnion())
    return type.getUnionTypes().flatMap((member) => fieldsOf(member));
  if (!type.isObject() || type.isArray() || type.getCallSignatures().length)
    return [];
  const declarations = (type.getAliasSymbol() ?? type.getSymbol())
    ?.getDeclarations()
    .map((node) => node.getSourceFile().getFilePath() as string);
  if (
    type.isClass() ||
    !declarations?.length ||
    !declarations.every((file) => file.startsWith(CLIENT_SOURCE))
  )
    return [];
  return type.getProperties().map((property) => property.getName());
};

const methods = (type: Type, prefix: string): Method[] =>
  type.getProperties().flatMap((property) => {
    if (isHidden(property)) return [];
    const name = `${prefix}.${property.getName()}`;
    const propertyType = property.getTypeAtLocation(client);
    const [signature] = propertyType.getCallSignatures();
    if (signature) {
      const returned = signature.getReturnType();
      const resolved =
        returned.getSymbol()?.getName() === "Promise"
          ? (returned.getTypeArguments()[0] ?? returned)
          : returned;
      const fields = [
        ...signature
          .getParameters()
          .flatMap((parameter) =>
            fieldsOf(parameter.getTypeAtLocation(client).getNonNullableType()),
          ),
        ...fieldsOf(resolved),
      ];
      return [{ name, fields: [...new Set(fields)].sort() }];
    }
    // The namespaces are client classes; configuration objects are not.
    return propertyType.isObject() && property.getName() !== "telemetry"
      ? methods(propertyType, name)
      : [];
  });

const page = readFileSync(path.join(ROOT, PAGE), "utf8");

// Each table row names one method; its section is everything under the
// row's ### heading, where the prose spells out the named response types.
const rows = new Map(
  [...page.matchAll(/^\|\s*`(cloud\.[\w.]+)`\s*\|(.*)$/gm)].map((match) => {
    const start = page.lastIndexOf("\n### ", match.index);
    const end = page.slice(match.index).search(/\n##+ /);
    const section = page.slice(
      start,
      end === -1 ? undefined : match.index + end,
    );
    return [match[1]!, section];
  }),
);

describe("the Cloud SDK reference covers the client", () => {
  const all = methods(client.getType(), "cloud");

  it("reads the client's methods", () => {
    expect(all.map((method) => method.name)).toContain(
      "cloud.threads.messages.list",
    );
  });

  it("has a row for every public method", () => {
    expect(
      all
        .map((method) => method.name)
        .filter((name) => !rows.has(name) && !IN_PROSE.has(name)),
    ).toEqual([]);
  });

  it("has no row for a method the client lacks", () => {
    const names = new Set(all.map((method) => method.name));
    expect([...rows.keys()].filter((name) => !names.has(name))).toEqual([]);
  });

  it("the agent skills call only client methods that exist", () => {
    const names = new Set(all.map((method) => method.name));
    const { skills } = JSON.parse(
      readFileSync(path.join(__dirname, "agent-skills.generated.json"), "utf8"),
    ) as { skills: { name: string; content: string }[] };
    expect(
      skills.flatMap(({ name, content }) =>
        [...content.matchAll(/\bcloud((?:\.\w+)+)\s*\(/g)]
          .map((match) => `cloud${match[1]}`)
          .filter((call) => !names.has(call))
          .map((call) => `${name}: ${call}`),
      ),
    ).toEqual([]);
  });

  it("the cloud skill names every thread and message method", () => {
    const { skills } = JSON.parse(
      readFileSync(path.join(__dirname, "agent-skills.generated.json"), "utf8"),
    ) as { skills: { name: string; content: string }[] };
    const skill = skills.find((entry) => entry.name === "cloud")!.content;
    expect(
      all
        .map((method) => method.name)
        .filter((name) => /^cloud\.threads\.(messages\.)?\w+$/.test(name))
        .filter((name) => !skill.includes(`${name}(`)),
    ).toEqual([]);
  });

  it("names every field a method takes or returns", () => {
    expect(
      all.flatMap((method) => {
        const section = rows.get(method.name);
        if (section === undefined) return [];
        const missing = method.fields.filter(
          (field) => !new RegExp(`\\b${field}\\b`).test(section),
        );
        return missing.length ? [`${method.name}: ${missing.join(", ")}`] : [];
      }),
    ).toEqual([]);
  });
});
