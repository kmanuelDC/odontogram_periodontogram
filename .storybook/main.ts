import type { StorybookConfig } from "@storybook/react-webpack5";

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
	addons: [
		"@storybook/addon-a11y",
		"@storybook/addon-webpack5-compiler-swc",
		"@storybook/addon-themes",
		"@storybook/addon-docs",
	],
	framework: { name: "@storybook/react-webpack5", options: {} },
	swc: () => ({ jsc: { transform: { react: { runtime: "automatic" } } } }),
};
export default config;
