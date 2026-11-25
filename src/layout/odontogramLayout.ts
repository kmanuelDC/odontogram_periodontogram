import { ALL_FDI, type Arch, type Dentition, toothInfo } from "../anatomy/fdi";
import { getToothGeometry } from "../anatomy/geometry";

export type ChartDentition = Dentition | "mixed";

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Where each part of one tooth goes in the chart, in chart millimetres. */
export interface ToothSlot {
	fdi: number;
	/** Column centre: the tooth's x = 0 (and its box and number) sit here. */
	x: number;
	lateral: Rect;
	occlusal: Rect;
	/** Centre of the FDI number. */
	label: { x: number; y: number };
	/** NTS text box (siglas). */
	box: Rect;
}

export interface OdontogramLayout {
	width: number;
	height: number;
	midlineX: number;
	occlusalPlaneY: number;
	/** Top and bottom of the teeth area (for the midline). */
	teethTop: number;
	teethBottom: number;
	teeth: ToothSlot[];
}

const COL = 13; // mm per column: widest view box (lower first molar, 11 mm + margins)
const MID_GAP = 3; // between quadrants
const PAD = 2;
const GAP = 1.5;
const LABEL = 5;
const BOX = 7;

/**
 * Chart layout as on the NTS sheet: boxes, upper permanent, upper primary,
 * occlusal plane, lower primary, lower permanent, boxes. Primary teeth sit
 * in their successor's column (55 under 15). Pure: no DOM, no React.
 */
export function layoutOdontogram(dentition: ChartDentition): OdontogramLayout {
	const perm = dentition !== "primary";
	const prim = dentition !== "permanent";
	const cols = perm ? 8 : 5;
	const midlineX = PAD + cols * COL + MID_GAP / 2;
	const slots = new Map<number, Partial<ToothSlot>>();
	const slot = (fdi: number) => {
		let s = slots.get(fdi);
		if (!s) {
			s = { fdi };
			slots.set(fdi, s);
		}
		return s;
	};
	const colX = (fdi: number) => {
		const { quadrant, position } = toothInfo(fdi);
		// Patient's right (quadrants 1, 4, 5, 8) is on the viewer's left.
		return [1, 4, 5, 8].includes(quadrant)
			? PAD + (cols - position) * COL + COL / 2
			: PAD + cols * COL + MID_GAP + (position - 1) * COL + COL / 2;
	};
	const group = (d: Dentition, arch: Arch) =>
		ALL_FDI.filter((f) => {
			const i = toothInfo(f);
			return i.dentition === d && i.arch === arch;
		});

	let y = PAD;
	const boxRow = (d: Dentition, arch: Arch) => {
		for (const f of group(d, arch)) {
			slot(f).box = {
				x: colX(f) - COL / 2 + 0.5,
				y,
				width: COL - 1,
				height: BOX,
			};
		}
		y += BOX + GAP;
	};
	const labelRow = (d: Dentition, arch: Arch) => {
		for (const f of group(d, arch)) {
			slot(f).label = { x: colX(f), y: y + LABEL / 2 };
		}
		y += LABEL;
	};
	// Lateral views share the CEJ line (y = 0 in every tooth).
	const lateralBand = (d: Dentition, arch: Arch) => {
		const teeth = group(d, arch);
		const boxes = teeth.map((f) => getToothGeometry(f).lateral.viewBox);
		const top = Math.min(...boxes.map((b) => b.y));
		const bottom = Math.max(...boxes.map((b) => b.y + b.height));
		teeth.forEach((f, i) => {
			const b = boxes[i];
			slot(f).lateral = { ...b, x: colX(f) + b.x, y: y + b.y - top };
		});
		y += bottom - top + GAP;
	};
	// Occlusal circles share their centre line.
	const occlusalBand = (d: Dentition, arch: Arch) => {
		const teeth = group(d, arch);
		const boxes = teeth.map((f) => getToothGeometry(f).occlusal.viewBox);
		const size = Math.max(...boxes.map((b) => b.height));
		teeth.forEach((f, i) => {
			const b = boxes[i];
			slot(f).occlusal = { ...b, x: colX(f) + b.x, y: y + size / 2 + b.y };
		});
		y += size + GAP;
	};

	// Upper arch: permanent boxes outermost.
	if (perm) {
		boxRow("permanent", "upper");
	}
	if (prim) {
		boxRow("primary", "upper");
	}
	const teethTop = y;
	if (perm) {
		labelRow("permanent", "upper");
		lateralBand("permanent", "upper");
		occlusalBand("permanent", "upper");
	}
	if (prim) {
		lateralBand("primary", "upper");
		occlusalBand("primary", "upper");
		labelRow("primary", "upper");
	}
	const occlusalPlaneY = y + GAP;
	y += 2 * GAP;
	// Lower arch: mirror of the upper one.
	if (prim) {
		labelRow("primary", "lower");
		occlusalBand("primary", "lower");
		lateralBand("primary", "lower");
	}
	if (perm) {
		occlusalBand("permanent", "lower");
		lateralBand("permanent", "lower");
		labelRow("permanent", "lower");
	}
	const teethBottom = y;
	if (prim) {
		boxRow("primary", "lower");
	}
	if (perm) {
		boxRow("permanent", "lower");
	}

	const teeth = [...slots.values()].map(
		(s) => ({ ...s, x: colX(s.fdi as number) }) as ToothSlot,
	);
	return {
		width: 2 * PAD + 2 * cols * COL + MID_GAP,
		height: y - GAP + PAD,
		midlineX,
		occlusalPlaneY,
		teethTop,
		teethBottom,
		teeth,
	};
}
