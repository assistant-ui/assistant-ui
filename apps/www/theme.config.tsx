import React from "react";
import { type DocsThemeConfig, useConfig } from "nextra-theme-docs";
import title from "title";

const config: DocsThemeConfig = {
	color: {
		hue: 158,
		saturation: 93,
	},
	logo: <span>assistant-ui</span>,
	project: {
		link: "https://github.com/Yonom/assistant-ui",
	},
	docsRepositoryBase:
		"https://github.com/Yonom/assistant-ui/tree/main/packages/docs",
	footer: { component: null },
	feedback: { content: null },
	editLink: { component: null },
	toc: { title: null, backToTop: false },
	main: ({ children }) => {
		const { frontMatter, filePath } = useConfig();
		return (
			<>
				<p className="mb-2 mt-4 text-sm font-bold text-[hsl(var(--nextra-primary-hue)_var(--nextra-primary-saturation)_45%)]">
					{title(filePath.split("/").at(-2)!)}
				</p>
				<h1 className="mb-2 inline-block text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-200">
					{frontMatter["title"]}
				</h1>
				<p>{frontMatter["description"]}</p>
				{children}
			</>
		);
	},
};

export default config;
