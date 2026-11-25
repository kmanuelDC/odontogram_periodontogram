import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/rules.ts", "src/print.css"],
	format: ["cjs", "esm"],
	dts: { entry: ["src/index.ts", "src/rules.ts"] }, // print.css needs no types
	sourcemap: true,
	clean: true,
	external: ["react", "react-dom"],
});
