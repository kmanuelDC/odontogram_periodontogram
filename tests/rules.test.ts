import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	FINDINGS,
	addFinding,
	conflictOf,
	parsePatientChart,
	perioSummary,
	validateFinding,
} from "../src/rules";

const IMPORT_LINE = /from "/;
const TYPE_EXPORT = /^export type/;

describe("rules entry", () => {
	it("exports the pure API a server needs", () => {
		for (const fn of [
			addFinding,
			conflictOf,
			parsePatientChart,
			perioSummary,
			validateFinding,
		]) {
			expect(typeof fn).toBe("function");
		}
		expect(Object.keys(FINDINGS)).toHaveLength(41);
		expect(
			conflictOf({ 16: [{ code: "implant" }] }, 16, {
				code: "caries",
				surfaces: ["O"],
			}),
		).toContain("Implante");
	});

	it("imports no components or CSS at runtime", () => {
		const source = readFileSync("src/rules.ts", "utf8");
		const runtime = source
			.split("\n")
			.filter((line) => IMPORT_LINE.test(line) && !TYPE_EXPORT.test(line));
		expect(runtime.some((line) => line.includes("components/"))).toBe(false);
		expect(source).not.toContain(".css");
	});
});
