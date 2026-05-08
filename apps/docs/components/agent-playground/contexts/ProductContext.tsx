import { createContext, useContext, type ReactNode } from "react";

export interface ProductBranding {
  name: string;
  tagline: string;
  logoUrl: string;
  docsUrl: string;
  repoUrl: string;
  githubOwner: string;
  githubRepo: string;
  defaultBranch: string;
  logoIncludesName?: boolean | undefined;
}

export interface ProductPrompt {
  headline: string;
  placeholder: string;
}

export interface ProductCatalogFilter {
  kind?: "template" | "example" | undefined;
  tag?: string | undefined;
  capability?: string | undefined;
}

export interface ProductConfig {
  id: string;
  branding: ProductBranding;
  prompt: ProductPrompt;
  catalog: { filter: ProductCatalogFilter };
  theme: { mode: "light" | "dark" | "custom"; cssClass?: string | undefined };
}

const ASSISTANT_UI_PRODUCT: ProductConfig = {
  id: "assistant-ui",
  branding: {
    name: "assistant-ui",
    tagline: "Agent",
    logoUrl: "/favicon/icon.svg",
    docsUrl: "https://www.assistant-ui.com/docs",
    repoUrl: "https://github.com/assistant-ui/assistant-ui",
    githubOwner: "assistant-ui",
    githubRepo: "assistant-ui",
    defaultBranch: "main",
  },
  prompt: {
    headline: "What should we build with assistant-ui?",
    placeholder: "a chat interface with code highlighting...",
  },
  catalog: { filter: {} },
  theme: { mode: "dark" },
};

const ProductContext = createContext<ProductConfig | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  return (
    <ProductContext.Provider value={ASSISTANT_UI_PRODUCT}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct(): ProductConfig {
  const context = useContext(ProductContext);
  if (!context)
    throw new Error("useProduct must be used within ProductProvider");
  return context;
}

export function getProductConfig(): ProductConfig {
  return ASSISTANT_UI_PRODUCT;
}
