import React from "react";
import { type DocsThemeConfig, useConfig } from "nextra-theme-docs";
import title from "title";
import Image from "next/image";
import icon from "./assets/icon.svg";

const config: DocsThemeConfig = {
	color: {
		hue: 158,
		saturation: 93,
	},
	logo: (
		<p className="flex items-center gap-2 font-bold text-lg">
			<Image src={icon} alt="logo" className="inline size-6 dark:invert" />{" "}
			assistant-ui
		</p>
	),
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
				<p className="mt-4 mb-2 font-bold text-[hsl(var(--nextra-primary-hue)_var(--nextra-primary-saturation)_45%)] text-sm">
					{title(filePath.split("/").at(-2)!)}
				</p>
				<h1 className="mb-2 inline-block font-extrabold text-2xl text-gray-900 tracking-tight dark:text-gray-200 sm:text-3xl">
					{frontMatter["title"]}
				</h1>
				<p>{frontMatter["description"]}</p>
				{children}
			</>
		);
	},
};

export default config;
