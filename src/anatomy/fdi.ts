export type Arch = "upper" | "lower";
export type Dentition = "permanent" | "primary";
export type ToothType =
	| "centralIncisor"
	| "lateralIncisor"
	| "canine"
	| "premolar1"
	| "premolar2"
	| "molar1"
	| "molar2"
	| "molar3";

const PERMANENT_TYPES: readonly ToothType[] = [
	"centralIncisor",
	"lateralIncisor",
	"canine",
	"premolar1",
	"premolar2",
	"molar1",
	"molar2",
	"molar3",
];
const PRIMARY_TYPES: readonly ToothType[] = [
	"centralIncisor",
	"lateralIncisor",
	"canine",
	"molar1",
	"molar2",
];

export interface ToothInfo {
	fdi: number;
	quadrant: number;
	position: number;
	arch: Arch;
	dentition: Dentition;
	type: ToothType;
	/** Mesial points to -x (quadrants 2, 3, 6, 7: right half of the chart). */
	mirrored: boolean;
}

/** The 52 FDI codes: 32 permanent (11–48) and 20 primary (51–85). */
export const ALL_FDI: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8].flatMap(
	(q) => Array.from({ length: q > 4 ? 5 : 8 }, (_, i) => q * 10 + i + 1),
);

export function isValidFdi(fdi: number): boolean {
	return ALL_FDI.includes(fdi);
}

export function toothInfo(fdi: number): ToothInfo {
	if (!isValidFdi(fdi)) {
		throw new RangeError(`Código FDI no válido: ${fdi}`);
	}
	const quadrant = Math.floor(fdi / 10);
	const position = fdi % 10;
	const dentition: Dentition = quadrant > 4 ? "primary" : "permanent";
	const q = (quadrant - 1) % 4; // 0..3 → 1/5, 2/6, 3/7, 4/8
	return {
		fdi,
		quadrant,
		position,
		arch: q < 2 ? "upper" : "lower",
		dentition,
		type: (dentition === "primary" ? PRIMARY_TYPES : PERMANENT_TYPES)[
			position - 1
		],
		mirrored: q === 1 || q === 2,
	};
}

/** Column order on the chart, left to right: 18…11 → -8…-1, 21…28 → 1…8. */
export function chartX(fdi: number): number {
	const t = toothInfo(fdi);
	return t.mirrored ? t.position : -t.position;
}
