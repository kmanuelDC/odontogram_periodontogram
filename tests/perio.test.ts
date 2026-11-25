import {
	type PerioChart,
	type PerioTooth,
	SITES,
	cal,
	furcationEntrances,
	perioSummary,
	setPerioSite,
	setPerioTooth,
	validatePerioTooth,
} from "../src";

describe("NIC (clinical attachment level)", () => {
	it("is PS + MG", () => {
		expect(cal({ pd: 4, gm: 2 })).toBe(6); // recession adds attachment loss
		expect(cal({ pd: 5, gm: -2 })).toBe(3); // enlargement: pseudo-pocket
		expect(cal({ pd: 3, gm: 0 })).toBe(3);
	});

	it("is undefined until both are recorded", () => {
		expect(cal({ pd: 4 })).toBeUndefined();
		expect(cal({ gm: 1 })).toBeUndefined();
		expect(cal(undefined)).toBeUndefined();
	});
});

describe("furcation entrances", () => {
	it.each([
		[16, ["V", "MP", "DP"]],
		[27, ["V", "MP", "DP"]],
		[36, ["V", "L"]],
		[48, ["V", "L"]],
		[14, ["M", "D"]],
		[24, ["M", "D"]],
		[15, []],
		[44, []],
		[11, []],
		[54, []],
	])("tooth %i: %j", (fdi, entrances) => {
		expect(furcationEntrances(fdi)).toEqual(entrances);
	});
});

describe("validation", () => {
	it.each([
		["a primary tooth", 54, {}],
		["an invalid tooth", 19, {}],
		["an unknown site", 16, { sites: { XX: { pd: 3 } } }],
		["a negative PS", 16, { sites: { V: { pd: -1 } } }],
		["an absurd PS", 16, { sites: { V: { pd: 30 } } }],
		["a non-number PS", 16, { sites: { V: { pd: Number.NaN } } }],
		["mobility 4", 16, { mobility: 4 }],
		["furcation on a single-rooted tooth", 11, { furcation: { V: 1 } }],
		["a lower molar palatal entrance", 36, { furcation: { MP: 1 } }],
		["furcation grade 5", 36, { furcation: { V: 5 } }],
		["an unknown prognosis", 16, { prognosis: "great" }],
	])("rejects %s", (_, fdi, tooth) => {
		expect(() =>
			validatePerioTooth(fdi as number, tooth as unknown as PerioTooth),
		).toThrow(RangeError);
	});

	it("accepts a full tooth record", () => {
		expect(() =>
			validatePerioTooth(16, {
				sites: { MV: { pd: 5, gm: 2, bleeding: true }, DL: { pd: 3, gm: -1 } },
				mobility: 2,
				furcation: { V: 2, MP: 1 },
				keratinized: 4,
				prognosis: "fair",
			}),
		).not.toThrow();
	});
});

describe("updates", () => {
	it("merges a site without touching the input", () => {
		const before: PerioChart = { 16: { sites: { V: { pd: 3 } }, mobility: 1 } };
		const after = setPerioSite(before, 16, "V", { bleeding: true });
		expect(after[16]).toEqual({
			sites: { V: { pd: 3, bleeding: true } },
			mobility: 1,
		});
		expect(before[16]?.sites?.V).toEqual({ pd: 3 });
	});

	it("merges tooth fields and keeps the sites", () => {
		const chart = setPerioTooth(setPerioSite({}, 36, "L", { pd: 4 }), 36, {
			furcation: { L: 2 },
		});
		expect(chart[36]).toEqual({ sites: { L: { pd: 4 } }, furcation: { L: 2 } });
	});

	it("validates on update", () => {
		expect(() => setPerioSite({}, 16, "V", { pd: 99 })).toThrow(RangeError);
		expect(() => setPerioTooth({}, 11, { furcation: { V: 1 } })).toThrow(
			RangeError,
		);
	});
});

describe("summary", () => {
	const full = (pd: number, extra: object = {}) =>
		Object.fromEntries(SITES.map((s) => [s, { pd, gm: 1, ...extra }]));

	it("is empty without examined sites", () => {
		expect(perioSummary({})).toEqual({
			teeth: 0,
			sites: 0,
			bleedingPct: null,
			plaquePct: null,
			suppurationSites: 0,
			meanPd: null,
			meanCal: null,
			sitesPd4: 0,
			sitesPd6: 0,
		});
	});

	it("computes percentages, means and deep-site counts", () => {
		const chart: PerioChart = {
			// 6 sites, PS 2, all bleeding
			11: { sites: full(2, { bleeding: true }) },
			// 6 sites, PS 6, plaque on all, one suppurating
			16: {
				sites: {
					...full(6, { plaque: true }),
					V: { pd: 6, gm: 1, plaque: true, suppuration: true },
				},
			},
			// missing: ignored even with data
			18: { missing: true, sites: full(9, { bleeding: true }) },
			// implant: counts; 2 sites, PS 4, no MG
			21: { implant: true, sites: { V: { pd: 4 }, L: { pd: 4 } } },
			// no PS: not examined
			22: { sites: { V: { bleeding: true } } },
		};
		const s = perioSummary(chart);
		expect(s.teeth).toBe(3);
		expect(s.sites).toBe(14);
		expect(s.bleedingPct).toBeCloseTo((6 / 14) * 100);
		expect(s.plaquePct).toBeCloseTo((6 / 14) * 100);
		expect(s.suppurationSites).toBe(1);
		expect(s.meanPd).toBeCloseTo((6 * 2 + 6 * 6 + 2 * 4) / 14);
		// NIC only where MG exists: 6 × (2+1) and 6 × (6+1)
		expect(s.meanCal).toBeCloseTo((6 * 3 + 6 * 7) / 12);
		expect(s.sitesPd4).toBe(8); // 6 at PS 6 + 2 at PS 4
		expect(s.sitesPd6).toBe(6);
	});
});
