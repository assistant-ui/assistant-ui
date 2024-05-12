type RegistryEntry = {
  name: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: string[];
  type: "components:ui";
};

export type RegistryIndex = RegistryEntry[];
