import { readFileSync } from "node:fs";

// Vitest runs from the package root.
const css = readFileSync("src/styles.css", "utf8");
const block = (selector: string) => {
	const start = css.indexOf(`${selector} {`);
	return css.slice(start, css.indexOf("}", start));
};
const declared = (text: string) =>
	new Set([...text.matchAll(/(--odp-[\w-]+)\s*:/g)].map((m) => m[1]));

// Set by components at runtime or meant to be set by users.
const RUNTIME = new Set([
	"--odp-auto-stroke",
	"--odp-stroke-width",
	"--odp-perio-label",
	"--odp-picker-tint", // local to .odp-picker
]);

it("defines every theme variable the stylesheet uses", () => {
	const used = new Set(
		[...css.matchAll(/var\((--odp-[\w-]+)/g)].map((m) => m[1]),
	);
	const root = declared(block(":root"));
	const missing = [...used].filter((v) => !(root.has(v) || RUNTIME.has(v)));
	expect(missing).toEqual([]);
});

it("keeps the dark and auto themes in sync", () => {
	const dark = declared(block(".odp-theme-dark"));
	const auto = declared(block("\t.odp-theme-auto"));
	expect([...auto].sort()).toEqual([...dark].sort());
});

it("keeps teeth and NTS colours out of the dark theme", () => {
	const dark = declared(block(".odp-theme-dark"));
	for (const v of ["--odp-tooth", "--odp-stroke", "--odp-red", "--odp-blue"]) {
		expect(dark.has(v)).toBe(false);
	}
});

it("prints in the light theme with exact colours", () => {
	const print = css.slice(css.indexOf("@media print"));
	expect(print).toContain("print-color-adjust: exact");
	expect(print).toContain("break-inside: avoid");
	for (const v of declared(block(".odp-theme-dark"))) {
		if (v !== "--odp-bg") {
			expect(print).toContain(`${v}:`);
		}
	}
});
