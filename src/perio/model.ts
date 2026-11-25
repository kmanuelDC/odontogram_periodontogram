import { isValidFdi, toothInfo } from "../anatomy/fdi";

/** The six probing sites: mesial, mid and distal on the vestibular and lingual/palatal side. */
export const SITES = ["MV", "V", "DV", "ML", "L", "DL"] as const;
export type Site = (typeof SITES)[number];

/** Furcation entrances: vestibular, lingual, mesial, distal, mesio/disto-palatal. */
export type FurcationEntrance = "V" | "L" | "M" | "D" | "MP" | "DP";

export type Grade = 0 | 1 | 2 | 3;
export type Prognosis = "good" | "fair" | "poor" | "questionable" | "hopeless";

export interface PerioSite {
	/** Probing depth (PS), mm. A site counts as examined when this is set. */
	pd?: number;
	/** Gingival margin (MG) from the CEJ, mm: positive = recession, negative = enlargement. */
	gm?: number;
	bleeding?: boolean;
	suppuration?: boolean;
	plaque?: boolean;
}

export interface PerioTooth {
	sites?: Partial<Record<Site, PerioSite>>;
	mobility?: Grade;
	/** Grade per entrance; only the tooth's own entrances (see furcationEntrances). */
	furcation?: Partial<Record<FurcationEntrance, Grade>>;
	/** Keratinized gingiva width, mm (vestibular). */
	keratinized?: number;
	implant?: boolean;
	missing?: boolean;
	prognosis?: Prognosis;
}

/** The whole periodontal chart: by FDI, permanent teeth only. Plain JSON. */
export type PerioChart = Readonly<Partial<Record<number, PerioTooth>>>;

const PROGNOSES: readonly Prognosis[] = [
	"good",
	"fair",
	"poor",
	"questionable",
	"hopeless",
];

/** Clinical attachment level (NIC) = PS + MG, or undefined when either is missing. */
export function cal(site: PerioSite | undefined): number | undefined {
	return site?.pd === undefined || site.gm === undefined
		? undefined
		: site.pd + site.gm;
}

/** Furcation entrances of a tooth, from its root anatomy ([] for single-rooted). */
export function furcationEntrances(fdi: number): FurcationEntrance[] {
	const { arch, type, dentition } = toothInfo(fdi);
	if (dentition !== "permanent") {
		return [];
	}
	if (type.startsWith("molar")) {
		return arch === "upper" ? ["V", "MP", "DP"] : ["V", "L"];
	}
	return arch === "upper" && type === "premolar1" ? ["M", "D"] : [];
}

function check(ok: boolean, message: string) {
	if (!ok) {
		throw new RangeError(message);
	}
}

const inRange = (v: number | undefined, min: number, max: number) =>
	v === undefined || (Number.isFinite(v) && v >= min && v <= max);
const isGrade = (v: number | undefined) =>
	v === undefined || [0, 1, 2, 3].includes(v);

/** Throws RangeError on data that cannot belong to this tooth. */
export function validatePerioTooth(fdi: number, tooth: PerioTooth): void {
	check(isValidFdi(fdi), `Código FDI no válido: ${fdi}`);
	check(
		toothInfo(fdi).dentition === "permanent",
		`El periodontograma es solo para piezas permanentes: ${fdi}`,
	);
	for (const [site, s] of Object.entries(tooth.sites ?? {})) {
		check(SITES.includes(site as Site), `Sitio desconocido: ${site}`);
		check(
			inRange(s?.pd, 0, 20),
			`${fdi} ${site}: la PS debe estar entre 0 y 20 mm`,
		);
		check(
			inRange(s?.gm, -10, 20),
			`${fdi} ${site}: el MG debe estar entre -10 y 20 mm`,
		);
	}
	check(isGrade(tooth.mobility), `${fdi}: la movilidad debe estar entre 0 y 3`);
	const entrances = furcationEntrances(fdi);
	for (const [entrance, grade] of Object.entries(tooth.furcation ?? {})) {
		check(
			entrances.includes(entrance as FurcationEntrance),
			`${fdi} no tiene entrada de furca ${entrance}`,
		);
		check(
			isGrade(grade),
			`${fdi} ${entrance}: la furca debe estar entre 0 y 3`,
		);
	}
	check(
		inRange(tooth.keratinized, 0, 20),
		`${fdi}: la encía queratinizada debe estar entre 0 y 20 mm`,
	);
	check(
		tooth.prognosis === undefined || PROGNOSES.includes(tooth.prognosis),
		`${fdi}: pronóstico desconocido ${tooth.prognosis}`,
	);
}

/** New chart with the tooth's fields merged in (validated; input untouched). */
export function setPerioTooth(
	chart: PerioChart,
	fdi: number,
	patch: Omit<PerioTooth, "sites">,
): PerioChart {
	const tooth = { ...chart[fdi], ...patch };
	validatePerioTooth(fdi, tooth);
	return { ...chart, [fdi]: tooth };
}

/** New chart with one site's fields merged in (validated; input untouched). */
export function setPerioSite(
	chart: PerioChart,
	fdi: number,
	site: Site,
	patch: PerioSite,
): PerioChart {
	const current = chart[fdi] ?? {};
	const tooth: PerioTooth = {
		...current,
		sites: { ...current.sites, [site]: { ...current.sites?.[site], ...patch } },
	};
	validatePerioTooth(fdi, tooth);
	return { ...chart, [fdi]: tooth };
}

export interface PerioSummary {
	/** Present teeth (not missing) with at least one examined site. */
	teeth: number;
	/** Examined sites (probing depth recorded). */
	sites: number;
	/** % of examined sites; null when nothing is examined. */
	bleedingPct: number | null;
	plaquePct: number | null;
	suppurationSites: number;
	meanPd: number | null;
	/** Mean NIC over sites with both PS and MG. */
	meanCal: number | null;
	sitesPd4: number;
	sitesPd6: number;
}

const mean = (xs: number[]) =>
	xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const pct = (n: number, of: number) => (of ? (100 * n) / of : null);

/** Chart indices. Missing teeth are left out; implants count. */
export function perioSummary(chart: PerioChart): PerioSummary {
	const examined: PerioSite[] = [];
	let teeth = 0;
	for (const tooth of Object.values(chart)) {
		if (!tooth || tooth.missing) {
			continue;
		}
		const sites = SITES.map((s) => tooth.sites?.[s]).filter(
			(s): s is PerioSite => s?.pd !== undefined,
		);
		teeth += sites.length > 0 ? 1 : 0;
		examined.push(...sites);
	}
	const count = (f: (s: PerioSite) => boolean) => examined.filter(f).length;
	const n = examined.length;
	return {
		teeth,
		sites: n,
		bleedingPct: pct(
			count((s) => Boolean(s.bleeding)),
			n,
		),
		plaquePct: pct(
			count((s) => Boolean(s.plaque)),
			n,
		),
		suppurationSites: count((s) => Boolean(s.suppuration)),
		meanPd: mean(examined.map((s) => s.pd as number)),
		meanCal: mean(
			examined.map(cal).filter((v): v is number => v !== undefined),
		),
		sitesPd4: count((s) => (s.pd as number) >= 4),
		sitesPd6: count((s) => (s.pd as number) >= 6),
	};
}
