import { chartX, isValidFdi, toothInfo } from "../anatomy/fdi";
import { SURFACES, type Surface } from "../anatomy/geometry";
import {
	FINDINGS,
	type FindingCode,
	type FindingDef,
	type FindingState,
	GAP_SPAN_KINDS,
	NO_OVERLAP_KINDS,
	SPAN_KINDS,
	SURFACE_CONFLICTS,
	SURFACE_KINDS,
	TOOTH_CONFLICTS,
} from "./catalog";

/** One finding on one tooth. Plain JSON: store it as is. */
export interface Finding {
	code: FindingCode;
	/** Ignored when the catalogue fixes the colour. Default: "good". */
	state?: FindingState;
	/** One of the catalogue siglas. Default: the first one. */
	sigla?: string;
	/** Occlusal surfaces, for surface findings (caries, restorations…). */
	surfaces?: readonly Surface[];
	/** Other end FDI, for bridges, orthodontic appliances and diastemas. */
	to?: number;
	/** Migration direction. Default: "mesial". */
	direction?: "mesial" | "distal";
	/** Where a fracture is. Default: "crown". */
	location?: "crown" | "root";
}

const LOCATION_NAMES = { crown: "en la corona", root: "en la raíz" } as const;

/** The whole chart: findings by FDI. */
export type OdontogramValue = Readonly<
	Partial<Record<number, readonly Finding[]>>
>;

/** Catalogue entry, or undefined for unknown codes (e.g. data from a newer version). */
export const findingDef = (f: Finding): FindingDef | undefined =>
	(FINDINGS as Record<string, FindingDef>)[f.code];

export const findingState = (f: Finding): FindingState =>
	findingDef(f)?.state ?? f.state ?? "good";

export const findingSigla = (f: Finding): string | undefined =>
	f.sigla ?? findingDef(f)?.siglas?.[0];

function validateLocation(def: FindingDef, f: Finding): void {
	if (f.location === undefined) {
		return;
	}
	if (def.kind !== "fracture") {
		throw new RangeError(`${def.name} no lleva ubicación`);
	}
	if (f.location !== "crown" && f.location !== "root") {
		throw new RangeError(`${def.name}: ubicación no válida (${f.location})`);
	}
}

/** Throws RangeError when the finding cannot be placed on this tooth. */
export function validateFinding(fdi: number, f: Finding): void {
	const def = findingDef(f);
	if (!isValidFdi(fdi)) {
		throw new RangeError(`Código FDI no válido: ${fdi}`);
	}
	if (!def) {
		throw new RangeError(`Hallazgo desconocido: ${f.code}`);
	}
	if (f.sigla && !def.siglas?.includes(f.sigla)) {
		throw new RangeError(`La sigla ${f.sigla} no corresponde a ${def.name}`);
	}
	validateLocation(def, f);
	if (SURFACE_KINDS.includes(def.kind)) {
		const surfaces = f.surfaces ?? [];
		if (surfaces.length === 0 || surfaces.some((s) => !SURFACES.includes(s))) {
			throw new RangeError(
				`${def.name}: elige una o más caras (V, L, M, D, O)`,
			);
		}
	}
	if (SPAN_KINDS.includes(def.kind)) {
		if (f.to === undefined || !isValidFdi(f.to) || f.to === fdi) {
			throw new RangeError(`${def.name}: elige hasta qué pieza llega`);
		}
		if (toothInfo(f.to).arch !== toothInfo(fdi).arch) {
			throw new RangeError(
				`${def.name}: ambas piezas deben estar en la misma arcada`,
			);
		}
	}
}

const clashes = (
	table: typeof TOOTH_CONFLICTS,
	a: FindingCode,
	b: FindingCode,
) =>
	table.some(
		([x, ys]) => (x === a && ys.includes(b)) || (x === b && ys.includes(a)),
	);

const isSpan = (f: Finding) =>
	SPAN_KINDS.includes(findingDef(f)?.kind ?? "sigla");
const overGaps = (f: Finding) =>
	GAP_SPAN_KINDS.includes(findingDef(f)?.kind ?? "sigla");

/** Every span on the chart with its two ends. */
const spansOf = (value: OdontogramValue) =>
	Object.entries(value).flatMap(([t, list]) =>
		(list ?? [])
			.filter((f) => isSpan(f) && f.to !== undefined)
			.map((f) => ({ f, a: Number(t), b: f.to as number })),
	);

/** Why `f` and `g` cannot share tooth `fdi`, or undefined if they can. */
function pairConflict(fdi: number, f: Finding, g: Finding): string | undefined {
	const name = findingDef(f)?.name;
	const other = findingDef(g)?.name;
	if (g.code === "missing") {
		return `La pieza ${fdi} está ausente: no puede tener ${name}`;
	}
	if (f.code === "missing") {
		return `La pieza ${fdi} tiene ${other}: no puede marcarse como ausente`;
	}
	const shared = (f.surfaces ?? []).filter((s) => g.surfaces?.includes(s));
	if (g.code === f.code) {
		if (!SURFACE_KINDS.includes(findingDef(f)?.kind ?? "sigla")) {
			return `La pieza ${fdi} ya tiene ${name}`;
		}
		if (shared.length > 0) {
			return `${name}: la cara ${shared.join(", ")} de la pieza ${fdi} ya está registrada`;
		}
	}
	if (
		clashes(TOOTH_CONFLICTS, f.code, g.code) ||
		(shared.length > 0 && clashes(SURFACE_CONFLICTS, f.code, g.code))
	) {
		return `La pieza ${fdi} tiene ${other}: no es compatible con ${name}`;
	}
	return undefined;
}

/** Why `f` cannot go on this tooth of this chart, or undefined if it can. */
function toothConflict(
	value: OdontogramValue,
	fdi: number,
	f: Finding,
): string | undefined {
	if (f.code === "missing") {
		const end = spansOf(value).find(
			(s) => !overGaps(s.f) && (s.a === fdi || s.b === fdi),
		);
		if (end) {
			return `La pieza ${fdi} es extremo de ${findingDef(end.f)?.name}: no puede marcarse como ausente`;
		}
	}
	for (const g of value[fdi] ?? []) {
		const problem =
			findingDef(g) && !isSpan(g) ? pairConflict(fdi, f, g) : undefined;
		if (problem) {
			return problem;
		}
	}
	return undefined;
}

/** Why the span `f` from `fdi` cannot be added, or undefined if it can. */
function spanConflict(
	value: OdontogramValue,
	fdi: number,
	f: Finding,
): string | undefined {
	const name = findingDef(f)?.name;
	const to = f.to as number;
	if (!overGaps(f)) {
		const gone = [fdi, to].find((t) =>
			(value[t] ?? []).some((g) => g.code === "missing"),
		);
		if (gone !== undefined) {
			return `${name}: la pieza ${gone} está ausente`;
		}
	}
	const range = (a: number, b: number) =>
		[Math.min(chartX(a), chartX(b)), Math.max(chartX(a), chartX(b))] as const;
	const [lo, hi] = range(fdi, to);
	for (const s of spansOf(value)) {
		if (s.f.code !== f.code) {
			continue;
		}
		const [l, h] = range(s.a, s.b);
		if (l === lo && h === hi) {
			return `${name}: ya está registrado entre ${s.a} y ${s.b}`;
		}
		const sameArch = toothInfo(s.a).arch === toothInfo(fdi).arch;
		if (
			sameArch &&
			NO_OVERLAP_KINDS.includes(findingDef(f)?.kind ?? "sigla") &&
			Math.max(l, lo) <= Math.min(h, hi)
		) {
			return `${name}: se cruza con la registrada entre ${s.a} y ${s.b}`;
		}
	}
	return undefined;
}

/**
 * Why `f` cannot be added to this chart, or undefined if it can: repeats,
 * clinical incompatibilities (catalogue tables) and crossing spans.
 */
export function conflictOf(
	value: OdontogramValue,
	fdi: number,
	f: Finding,
): string | undefined {
	return isSpan(f) ? spanConflict(value, fdi, f) : toothConflict(value, fdi, f);
}

/** New value with the finding added (the input is not modified). */
export function addFinding(
	value: OdontogramValue,
	fdi: number,
	finding: Finding,
): OdontogramValue {
	validateFinding(fdi, finding);
	const problem = conflictOf(value, fdi, finding);
	if (problem) {
		throw new RangeError(problem);
	}
	return { ...value, [fdi]: [...(value[fdi] ?? []), finding] };
}

/** New value without the finding at `index` of that tooth. */
export function removeFinding(
	value: OdontogramValue,
	fdi: number,
	index: number,
): OdontogramValue {
	const rest = (value[fdi] ?? []).filter((_, i) => i !== index);
	const next = { ...value, [fdi]: rest };
	if (rest.length === 0) {
		delete next[fdi];
	}
	return next;
}

/** Spanish summary for screen readers: "Caries CE (M, O); Corona definitiva CM". */
export function describeFindings(findings: readonly Finding[]): string {
	return findings
		.filter(findingDef)
		.map((f) => {
			const sigla = findingSigla(f);
			const surfaces = f.surfaces ?? [];
			const where = surfaces.length > 0 ? ` (${surfaces.join(", ")})` : "";
			const to = f.to ? ` hasta ${f.to}` : "";
			const at = f.location ? ` ${LOCATION_NAMES[f.location]}` : "";
			return `${findingDef(f)?.name}${sigla ? ` ${sigla}` : ""}${at}${where}${to}`;
		})
		.join("; ");
}
