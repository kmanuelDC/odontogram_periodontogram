import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./tests/setup.ts",
		// Stories are demos, not library code.
		coverage: { include: ["src/**/*"], exclude: ["src/stories/**"] },
	},
});
