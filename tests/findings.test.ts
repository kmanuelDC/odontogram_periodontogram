import {
	FINDINGS,
	type Finding,
	type OdontogramValue,
	SIGLA_NAMES,
	addFinding,
	describeFindings,
	findingSigla,
	findingState,
	removeFinding,
} from "../src";

describe("catalogue", () => {
	it.each(Object.entries(FINDINGS))("%s has a name and a kind", (_, def) => {
		expect(def.name).toBeTruthy();
		expect(def.kind).toBeTruthy();
	});

	it("lets a finding override a shared sigla meaning", () => {
		expect(SIGLA_NAMES.D).toBe("Distalizado");
		expect(FINDINGS.enamelDefect.siglaNames.D).toBe("Decoloración del esmalte");
	});

	it("records enamel defects on a surface", () => {
		const v = addFinding({}, 17, {
			code: "enamelDefect",
			sigla: "HM",
			surfaces: ["V"],
		});
		expect(describeFindings(v[17] ?? [])).toBe(
			"Defecto de desarrollo del esmalte HM (V)",
		);
		expect(() => addFinding({}, 17, { code: "enamelDefect" })).toThrow(
			RangeError,
		);
	});

	it("explains every sigla", () => {
		const siglas = Object.values(FINDINGS).flatMap(
			(d) => ("siglas" in d ? d.siglas : []) as readonly string[],
		);
		expect(siglas.filter((s) => !SIGLA_NAMES[s])).toEqual([]);
	});
});

describe("state and sigla", () => {
	it("fixed colours win over the given state", () => {
		expect(
			findingState({ code: "caries", state: "good", surfaces: ["O"] }),
		).toBe("bad");
		expect(findingState({ code: "missing", state: "bad" })).toBe("good");
	});

	it("free colours default to good", () => {
		expect(findingState({ code: "crown" })).toBe("good");
		expect(findingState({ code: "crown", state: "bad" })).toBe("bad");
	});

	it("uses the first catalogue sigla by default", () => {
		expect(findingSigla({ code: "crown" })).toBe("CM");
		expect(findingSigla({ code: "crown", sigla: "CV" })).toBe("CV");
		expect(findingSigla({ code: "missing" })).toBeUndefined();
	});
});

describe("addFinding", () => {
	it("adds without modifying the input", () => {
		const before = {};
		const after = addFinding(before, 16, {
			code: "caries",
			surfaces: ["O", "M"],
		});
		expect(before).toEqual({});
		expect(after[16]).toHaveLength(1);
	});

	it.each([
		["an invalid tooth", 19, { code: "missing" }],
		["an unknown code", 16, { code: "nope" }],
		["a foreign sigla", 16, { code: "crown", sigla: "AM" }],
		["a surface finding without surfaces", 16, { code: "caries" }],
		["an invalid surface", 16, { code: "caries", surfaces: ["X"] }],
		["a bridge without its other end", 16, { code: "fixedProsthesis" }],
		["a bridge to itself", 16, { code: "fixedProsthesis", to: 16 }],
		["a bridge across arches", 16, { code: "fixedProsthesis", to: 46 }],
		["a location outside a fracture", 16, { code: "crown", location: "root" }],
		["an invalid location", 16, { code: "fracture", location: "apex" }],
	])("rejects %s", (_, fdi, finding) => {
		expect(() => addFinding({}, fdi as number, finding as Finding)).toThrow(
			RangeError,
		);
	});

	it("rejects a second crown on the same tooth", () => {
		const v = addFinding({}, 16, { code: "crown", sigla: "CMC" });
		expect(() => addFinding(v, 16, { code: "crown", sigla: "CM" })).toThrow(
			RangeError,
		);
		expect(() => addFinding(v, 16, { code: "temporaryCrown" })).toThrow(
			RangeError,
		);
		expect(() => addFinding(v, 17, { code: "crown" })).not.toThrow();
	});

	it("rejects the same span twice, in either direction or state", () => {
		const v = addFinding({}, 17, {
			code: "fixedProsthesis",
			to: 14,
			state: "bad",
		});
		for (const [fdi, to] of [
			[17, 14],
			[14, 17],
		]) {
			expect(() =>
				addFinding(v, fdi, { code: "fixedProsthesis", to, state: "good" }),
			).toThrow("Prótesis fija: ya está registrado");
		}
		// Other ends or another span kind are fine.
		expect(() =>
			addFinding(v, 13, { code: "fixedProsthesis", to: 11 }),
		).not.toThrow();
		expect(() =>
			addFinding(v, 17, { code: "removableProsthesis", to: 14 }),
		).not.toThrow();
	});

	describe("clinical rules", () => {
		const chart = (fdi: number, ...fs: Finding[]) =>
			fs.reduce((v, f) => addFinding(v, fdi, f), {} as OdontogramValue);

		it.each<[string, Finding[], Finding, string]>([
			[
				"a repeated extraction",
				[{ code: "extraction" }],
				{ code: "extraction" },
				"ya tiene",
			],
			[
				"a repeated absence",
				[{ code: "missing" }],
				{ code: "missing" },
				"ausente",
			],
			[
				"a crown on an absent tooth",
				[{ code: "missing" }],
				{ code: "crown" },
				"está ausente",
			],
			[
				"an extraction on an absent tooth",
				[{ code: "missing" }],
				{ code: "extraction" },
				"está ausente",
			],
			[
				"an absent tooth with a crown",
				[{ code: "crown" }],
				{ code: "missing" },
				"no puede marcarse como ausente",
			],
			[
				"two mobility grades",
				[{ code: "mobility" }],
				{ code: "mobility", sigla: "M2" },
				"ya tiene",
			],
			[
				"caries twice on one surface",
				[{ code: "caries", surfaces: ["O"] }],
				{ code: "caries", surfaces: ["O", "M"] },
				"la cara O",
			],
			[
				"a sealant on a restored surface",
				[{ code: "restoration", surfaces: ["O"] }],
				{ code: "sealant", surfaces: ["O"] },
				"no es compatible",
			],
			[
				"caries on an implant",
				[{ code: "implant" }],
				{ code: "caries", surfaces: ["O"] },
				"no es compatible",
			],
			[
				"extruded and intruded",
				[{ code: "extruded" }],
				{ code: "intruded" },
				"no es compatible",
			],
			[
				"a crown on a root remnant",
				[{ code: "rootRemnant" }],
				{ code: "crown" },
				"no es compatible",
			],
		])("rejects %s", (_, before, f, message) => {
			expect(() => addFinding(chart(16, ...before), 16, f)).toThrow(message);
		});

		it.each<[string, Finding[], Finding]>([
			[
				"caries on another surface",
				[{ code: "caries", surfaces: ["O"] }],
				{ code: "caries", surfaces: ["M"] },
			],
			[
				"a sealant beside a restoration",
				[{ code: "restoration", surfaces: ["O"] }],
				{ code: "sealant", surfaces: ["V"] },
			],
			[
				"caries next to a restoration",
				[{ code: "restoration", surfaces: ["O"] }],
				{ code: "caries", surfaces: ["O"] },
			],
			[
				"a crown with pulp treatment",
				[{ code: "pulpTreatment" }],
				{ code: "crown" },
			],
			["a crown on an implant", [{ code: "implant" }], { code: "crown" }],
		])("accepts %s", (_, before, f) => {
			expect(() => addFinding(chart(16, ...before), 16, f)).not.toThrow();
		});

		it("keeps bridges off absent teeth, but not removable prostheses", () => {
			const v = chart(14, { code: "missing" });
			expect(() =>
				addFinding(v, 17, { code: "fixedProsthesis", to: 14 }),
			).toThrow("la pieza 14 está ausente");
			expect(() =>
				addFinding(v, 17, { code: "removableProsthesis", to: 14 }),
			).not.toThrow();
			const bridge = chart(17, { code: "fixedProsthesis", to: 15 });
			expect(() => addFinding(bridge, 15, { code: "missing" })).toThrow(
				"es extremo de Prótesis fija",
			);
		});

		it("rejects crossing or touching bridges, also across the midline", () => {
			const v = chart(17, { code: "fixedProsthesis", to: 14 });
			for (const [a, b] of [
				[15, 12],
				[14, 11],
				[13, 16],
			]) {
				expect(() =>
					addFinding(v, a, { code: "fixedProsthesis", to: b }),
				).toThrow("se cruza");
			}
			const mid = chart(12, { code: "fixedProsthesis", to: 22 });
			expect(() =>
				addFinding(mid, 21, { code: "fixedProsthesis", to: 23 }),
			).toThrow("se cruza");
			// Diastemas may share a tooth: 11–12 and 11–21.
			const d = chart(11, { code: "diastema", to: 12 });
			expect(() =>
				addFinding(d, 11, { code: "diastema", to: 21 }),
			).not.toThrow();
		});
	});

	it("accepts a bridge across the midline", () => {
		expect(() =>
			addFinding({}, 13, { code: "fixedProsthesis", to: 23 }),
		).not.toThrow();
	});
});

describe("removeFinding", () => {
	it("removes by index and drops empty teeth", () => {
		let v = addFinding({}, 11, { code: "crown" });
		v = addFinding(v, 11, { code: "pulpTreatment" });
		v = removeFinding(v, 11, 0);
		expect(v[11]).toEqual([{ code: "pulpTreatment" }]);
		expect(11 in removeFinding(v, 11, 0)).toBe(false);
	});
});

it("describes findings in Spanish for screen readers", () => {
	expect(
		describeFindings([
			{ code: "caries", sigla: "CD", surfaces: ["M", "O"] },
			{ code: "fixedProsthesis", to: 14 },
			{ code: "fracture", location: "root" },
			{ code: "unknown" as never },
		]),
	).toBe("Caries CD (M, O); Prótesis fija hasta 14; Fractura en la raíz");
});
