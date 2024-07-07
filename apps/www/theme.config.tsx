import icon from "@/public/favicon/favicon.svg";
import Image from "next/image";
import { type DocsThemeConfig, useConfig } from "nextra-theme-docs";
import React, { FC, PropsWithChildren } from "react";

const Head: FC = () => {
  const { frontMatter, title } = useConfig();
  const description =
    frontMatter["description"] ?? "React Components for AI Chat";
  const hasTitle = title !== "Index";
  return (
    <>
      <title>{hasTitle ? `${title} - assistant-ui` : "assistant-ui"}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
    </>
  );
};

const Main: FC<PropsWithChildren> = ({ children }) => {
  const { frontMatter, normalizePagesResult } = useConfig();
  return (
    <>
      <p className="mb-2 mt-4 text-sm font-bold text-[hsl(var(--nextra-primary-hue)_var(--nextra-primary-saturation)_45%)]">
        {normalizePagesResult.activePath.at(-2)?.title}
      </p>
      <h1 className="text-foreground mb-2 inline-block text-2xl font-extrabold tracking-tight sm:text-3xl">
        {frontMatter["title"]}
      </h1>
      <p>{frontMatter["description"]}</p>
      {children}
    </>
  );
};

const config: DocsThemeConfig = {
  color: {
    hue: 158,
    saturation: 93,
  },
  logo: (
    <p className="flex items-center gap-2 text-lg font-bold">
      <Image src={icon} alt="logo" className="inline size-6" /> assistant-ui
    </p>
  ),
  project: {
    link: "https://github.com/Yonom/assistant-ui",
  },
  chat: {
    link: "https://discord.gg/S9dwgCNEFs",
  },
  docsRepositoryBase:
    "https://github.com/Yonom/assistant-ui/tree/main/packages/docs",
  footer: { component: null },
  feedback: { content: null },
  editLink: { component: null },
  toc: { title: null, backToTop: false },
  main: Main,
  head: Head,
};

export default config;
