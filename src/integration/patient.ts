import { isValidFdi } from "../anatomy/fdi";
import { SURFACES } from "../anatomy/geometry";
import type { MarkZone, ToothMark } from "../components/ToothSvg";
import {
	type Finding,
	type OdontogramValue,
	validateFinding,
} from "../findings/model";
import {
	type PerioChart,
	type PerioTooth,
	validatePerioTooth,
} from "../perio/model";

export const PATIENT_CHART_VERSION = 1;

/** Everything charted for one patient. Plain JSON: store and load it as is. */
export interface PatientChart {
	version: typeof PATIENT_CHART_VERSION;
	odontogram: OdontogramValue;
	periodontogram: PerioChart;
	marks: ToothMark[];
}

export const emptyPatientChart = (): PatientChart => ({
	version: PATIENT_CHART_VERSION,
	odontogram: {},
	periodontogram: {},
	marks: [],
});

/**
 * The periodontal chart as it should be shown: teeth the odontogram records
 * as missing or implants get those flags. Derived, never stored, so the
 * periodontogram cannot go stale when the odontogram changes.
 */
export function perioWithOdontogram(
	perio: PerioChart,
	odontogram: OdontogramValue | undefined,
): PerioChart {
	if (!odontogram) {
		return perio;
	}
	const merged: Record<number, PerioTooth | undefined> = { ...perio };
	for (const [key, findings] of Object.entries(odontogram)) {
		const fdi = Number(key);
		const codes = new Set((findings ?? []).map((f) => f.code));
		const missing = codes.has("missing");
		const implant = codes.has("implant");
		if (fdi < 50 && (missing || implant)) {
			merged[fdi] = {
				...merged[fdi],
				...(missing ? { missing: true } : {}),
				...(implant ? { implant: true } : {}),
			};
		}
	}
	return merged;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

function fail(message: string): never {
	throw new RangeError(`Ficha del paciente no válida: ${message}`);
}

const ZONES: readonly MarkZone[] = [...SURFACES, "crown", "root"];

function parseMark(m: unknown, i: number): ToothMark {
	if (!isObject(m)) {
		fail(`marks[${i}] no es un objeto`);
	}
	const ok =
		typeof m.fdi === "number" &&
		isValidFdi(m.fdi) &&
		(m.view === "lateral" || m.view === "occlusal") &&
		Number.isFinite(m.x) &&
		Number.isFinite(m.y) &&
		ZONES.includes(m.zone as MarkZone) &&
		typeof m.geometryVersion === "number" &&
		(m.color === undefined || typeof m.color === "string");
	if (!ok) {
		fail(`marks[${i}] tiene un formato incorrecto`);
	}
	return m as unknown as ToothMark;
}

/**
 * Validates data loaded from storage (a JSON string or an already parsed
 * object). Throws RangeError with the first problem found.
 */
export function parsePatientChart(input: unknown): PatientChart {
	let data: unknown = input;
	if (typeof input === "string") {
		try {
			data = JSON.parse(input);
		} catch {
			fail("no es un JSON válido");
		}
	}
	if (!isObject(data)) {
		fail("se esperaba un objeto");
	}
	if (data.version !== PATIENT_CHART_VERSION) {
		fail(`versión no soportada: ${String(data.version)}`);
	}
	const { odontogram = {}, periodontogram = {}, marks = [] } = data;
	if (
		!(isObject(odontogram) && isObject(periodontogram) && Array.isArray(marks))
	) {
		fail("odontogram, periodontogram y marks tienen un tipo incorrecto");
	}
	const wrap = (where: string, check: () => void) => {
		try {
			check();
		} catch (e) {
			fail(`${where}: ${(e as Error).message}`);
		}
	};
	for (const [key, findings] of Object.entries(odontogram)) {
		if (!Array.isArray(findings)) {
			fail(`odontogram ${key} no es una lista`);
		}
		findings.forEach((f: Finding, i) =>
			wrap(`odontogram ${key}[${i}]`, () => validateFinding(Number(key), f)),
		);
	}
	for (const [key, tooth] of Object.entries(periodontogram)) {
		if (!isObject(tooth)) {
			fail(`periodontogram ${key} no es un objeto`);
		}
		wrap(`periodontogram ${key}`, () =>
			validatePerioTooth(Number(key), tooth as PerioTooth),
		);
	}
	return {
		version: PATIENT_CHART_VERSION,
		odontogram: odontogram as OdontogramValue,
		periodontogram: periodontogram as PerioChart,
		marks: marks.map(parseMark),
	};
}
