import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-webpack5";
import "../src/styles.css";
import "../src/print.css";

// The toolbar theme switch puts the library's theme class on <html>; the
// page background follows the theme's --odp-bg.
const PAGE_STYLE = document.createElement("style");
PAGE_STYLE.textContent =
	"body { background: var(--odp-bg); color: var(--odp-text); }";
document.head.append(PAGE_STYLE);

export const decorators = [
	withThemeByClassName({
		themes: {
			claro: "odp-theme-light",
			oscuro: "odp-theme-dark",
			sistema: "odp-theme-auto",
		},
		defaultTheme: "claro",
	}),
];

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/,
			},
		},
	},
};

export default preview;
