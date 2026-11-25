import type { Arch, Dentition } from "./fdi";

/** Shape of the occlusal/incisal border in the lateral view. */
export type EdgeKind = "incisal" | "cusp" | "premolar" | "molar";

export interface RootSpec {
	/** mm from the CEJ to the apex. */
	length: number;
	/** Apex x offset in mm; -x is distal. */
	apex: number;
}

/**
 * One tooth type, in mm (average anatomical values). Canonical orientation:
 * upper arch, root up, mesial to +x, vestibular to -y in the occlusal view.
 */
export interface ToothTemplate {
	edge: EdgeKind;
	/** Mesiodistal crown width (also sizes the occlusal circle). */
	width: number;
	/** Crown width at the CEJ. */
	cervical: number;
	/** Crown height, CEJ to incisal edge / cusp tip. */
	height: number;
	roots: readonly RootSpec[];
	/** Root trunk length (CEJ → furcation), multi-rooted teeth only. */
	trunk?: number;
}

const single = (length: number): RootSpec[] => [{ length, apex: -0.4 }];

// Indexed by position - 1 (1 = central incisor).
export const TEMPLATES: Record<
	Dentition,
	Record<Arch, readonly ToothTemplate[]>
> = {
	permanent: {
		upper: [
			{
				edge: "incisal",
				width: 8.5,
				cervical: 6.5,
				height: 10.5,
				roots: single(13),
			},
			{
				edge: "incisal",
				width: 6.5,
				cervical: 5,
				height: 9,
				roots: single(13),
			},
			{
				edge: "cusp",
				width: 7.5,
				cervical: 5.5,
				height: 10,
				roots: single(17),
			},
			{
				edge: "premolar",
				width: 7,
				cervical: 5,
				height: 8.5,
				trunk: 7,
				roots: [
					{ length: 14, apex: -1.4 },
					{ length: 14, apex: 1.2 },
				],
			},
			{
				edge: "premolar",
				width: 6.5,
				cervical: 5,
				height: 8.5,
				roots: single(14),
			},
			{
				edge: "molar",
				width: 10,
				cervical: 7.5,
				height: 7.5,
				trunk: 4,
				roots: [
					{ length: 12, apex: -2.4 },
					{ length: 13, apex: 0 },
					{ length: 12.5, apex: 2.4 },
				],
			},
			{
				edge: "molar",
				width: 9,
				cervical: 7,
				height: 7,
				trunk: 4.5,
				roots: [
					{ length: 12, apex: -1.8 },
					{ length: 12.5, apex: 0 },
					{ length: 12, apex: 1.6 },
				],
			},
			{
				edge: "molar",
				width: 8.5,
				cervical: 6.5,
				height: 6.5,
				trunk: 6,
				roots: [
					{ length: 10, apex: -1.6 },
					{ length: 11, apex: -0.4 },
					{ length: 10, apex: 1 },
				],
			},
		],
		lower: [
			{
				edge: "incisal",
				width: 5,
				cervical: 3.5,
				height: 9,
				roots: single(12.5),
			},
			{
				edge: "incisal",
				width: 5.5,
				cervical: 4,
				height: 9.5,
				roots: single(14),
			},
			{
				edge: "cusp",
				width: 7,
				cervical: 5.5,
				height: 11,
				roots: single(16),
			},
			{
				edge: "premolar",
				width: 7,
				cervical: 5,
				height: 8.5,
				roots: single(14),
			},
			{
				edge: "premolar",
				width: 7,
				cervical: 5,
				height: 8,
				roots: single(14.5),
			},
			{
				edge: "molar",
				width: 11,
				cervical: 9,
				height: 7.5,
				trunk: 3,
				roots: [
					{ length: 13, apex: -2.8 },
					{ length: 14, apex: 2.6 },
				],
			},
			{
				edge: "molar",
				width: 10.5,
				cervical: 8,
				height: 7,
				trunk: 3.5,
				roots: [
					{ length: 13, apex: -2.2 },
					{ length: 13.5, apex: 2 },
				],
			},
			{
				edge: "molar",
				width: 10,
				cervical: 7.5,
				height: 7,
				trunk: 5,
				roots: [
					{ length: 11, apex: -1.6 },
					{ length: 11.5, apex: 0.8 },
				],
			},
		],
	},
	// Primary teeth: smaller crowns, short trunks and divergent roots.
	primary: {
		upper: [
			{
				edge: "incisal",
				width: 6.5,
				cervical: 5,
				height: 6,
				roots: single(10),
			},
			{
				edge: "incisal",
				width: 5.1,
				cervical: 3.7,
				height: 5.6,
				roots: single(11),
			},
			{
				edge: "cusp",
				width: 7,
				cervical: 5,
				height: 6.5,
				roots: single(13),
			},
			{
				edge: "molar",
				width: 7.3,
				cervical: 5.2,
				height: 5.1,
				trunk: 1.5,
				roots: [
					{ length: 10, apex: -3.4 },
					{ length: 10.5, apex: 0 },
					{ length: 10, apex: 3.4 },
				],
			},
			{
				edge: "molar",
				width: 8.2,
				cervical: 6.3,
				height: 5.7,
				trunk: 1.5,
				roots: [
					{ length: 11.5, apex: -4.4 },
					{ length: 12, apex: 0 },
					{ length: 11.5, apex: 4.4 },
				],
			},
		],
		lower: [
			{
				edge: "incisal",
				width: 4.2,
				cervical: 3,
				height: 5,
				roots: single(9),
			},
			{
				edge: "incisal",
				width: 4.1,
				cervical: 3,
				height: 5.2,
				roots: single(10),
			},
			{
				edge: "cusp",
				width: 5,
				cervical: 3.7,
				height: 6,
				roots: single(11.5),
			},
			{
				edge: "molar",
				width: 7.7,
				cervical: 6,
				height: 6,
				trunk: 1.5,
				roots: [
					{ length: 9.8, apex: -4 },
					{ length: 9.8, apex: 4 },
				],
			},
			{
				edge: "molar",
				width: 9.9,
				cervical: 7.2,
				height: 5.5,
				trunk: 1.5,
				roots: [
					{ length: 12.5, apex: -5 },
					{ length: 12.5, apex: 5 },
				],
			},
		],
	},
};
