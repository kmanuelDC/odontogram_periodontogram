import { type ToothInfo, toothInfo } from "./fdi";
import { type EdgeKind, type RootSpec, TEMPLATES } from "./templates";

export type Pt = readonly [number, number];
/** V vestibular, L lingual/palatal, M mesial, D distal, O occlusal/incisal. */
export type Surface = "V" | "L" | "M" | "D" | "O";
export const SURFACES: readonly Surface[] = ["V", "L", "M", "D", "O"];

/**
 * Bump whenever a template or the geometry changes the drawn shapes: marks
 * stored in tooth millimetres with an older version may no longer line up.
 */
export const GEOMETRY_VERSION = 1;

export interface ViewBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Side view: crown + roots, in mm. The CEJ is always at y = 0. */
export interface LateralView {
	viewBox: ViewBox;
	crown: string;
	roots: string;
	/** Root seen behind the others (palatal root of upper molars), or "". */
	rootsBehind: string;
	/** Fine anatomy (cingulum, ridges, grooves) as open strokes; meant for large sizes. */
	details: string;
	/** Cemento-enamel junction (vestibular), open path: the 0 mm line of the periodontogram. */
	cej: string;
	/** One axis per root, cervical → apex (for endodontics, implants…). */
	rootAxes: readonly (readonly [Pt, Pt])[];
	/** y of the incisal edge / cusp tip. */
	edgeY: number;
	/** y of the longest root apex. */
	apexY: number;
}

/** Occlusal view: a circle split into five surfaces (4 ring sectors + centre) with no gaps. */
export interface OcclusalView {
	viewBox: ViewBox;
	outline: readonly Pt[];
	surfaces: Readonly<Record<Surface, readonly Pt[]>>;
}

export interface ToothGeometry extends ToothInfo {
	rootCount: number;
	lateral: LateralView;
	occlusal: OcclusalView;
}

type Seg = readonly [Pt, Pt, Pt]; // cubic: ctrl1, ctrl2, end

/** Vestibular CEJ curvature, as a fraction of the crown height. */
const CEJ_CURVE: Record<EdgeKind, number> = {
	incisal: 0.22,
	cusp: 0.2,
	premolar: 0.12,
	molar: 0.08,
};

const CONTOUR = 0.5; // height of contour, fraction of the crown height
const OUTLINE_POINTS = 96; // divisible by 8: surface boundaries fall on points
const INNER = 0.45; // occlusal circle radius, fraction of the outer circle
// Only two circle sizes (mm), as on the printed chart: anterior and posterior teeth.
const ANTERIOR_RADIUS = 3.5;
const POSTERIOR_RADIUS = 5;
const POSTERIOR = /premolar|molar/;
const PAD = 1; // mm around each view
const DISTAL_CURVE = 0.05; // apex shift toward distal, fraction of root length

type Stroke = readonly [Pt, readonly Seg[]]; // open path: start + cubics

const mirrorX = ([start, segs]: Stroke): Stroke => [
	[-start[0], start[1]],
	segs.map((seg) => seg.map(([x, y]) => [-x, y] as const) as unknown as Seg),
];

/**
 * Fine anatomy seen from vestibular, as faint open strokes: cingulum and
 * developmental grooves (incisors), cusp ridge (canine, premolar), marginal
 * ridges (premolars, molars) and buccal groove (molars).
 */
function detailStrokes(
	edge: EdgeKind,
	m: number,
	c: number,
	h: number,
): Stroke[] {
	const cingulum: Stroke = [
		[-0.45 * c, 0.42 * h],
		[
			[
				[-0.4 * c, 0.16 * h],
				[0.4 * c, 0.16 * h],
				[0.45 * c, 0.42 * h],
			],
		],
	];
	const ridge = (bend: number, to: number): Stroke => [
		[0, 0.94 * h],
		[
			[
				[0, 0.8 * h],
				[bend * m, 0.68 * h],
				[bend * m, to * h],
			],
		],
	];
	const marginal = (x: number): Stroke => [
		[-x * m, 0.74 * h],
		[
			[
				[-(x - 0.1) * m, 0.8 * h],
				[-(x - 0.25) * m, 0.84 * h],
				[-(x - 0.4) * m, 0.85 * h],
			],
		],
	];
	if (edge === "incisal") {
		const lobe: Stroke = [
			[-0.32 * m, 0.96 * h],
			[
				[
					[-0.32 * m, 0.86 * h],
					[-0.3 * m, 0.78 * h],
					[-0.27 * m, 0.7 * h],
				],
			],
		];
		return [cingulum, lobe, mirrorX(lobe)];
	}
	if (edge === "cusp") {
		return [cingulum, ridge(0.04, 0.5)];
	}
	const margins = [marginal(edge === "molar" ? 0.9 : 0.85)];
	margins.push(mirrorX(margins[0]));
	return edge === "molar"
		? [...margins, ridge(0.03, 0.62)]
		: [...margins, ridge(0.03, 0.55)];
}

/** Incisal/occlusal border from (-m, hc) to (m, hc). */
function edgeSegments(edge: EdgeKind, m: number, h: number): Seg[] {
	const hc = CONTOUR * h;
	if (edge === "incisal") {
		return [
			[
				[-m, 0.82 * h],
				[-0.82 * m, h],
				[-0.55 * m, h],
			],
			[
				[-0.2 * m, h],
				[0.4 * m, h],
				[0.85 * m, h],
			],
			[
				[0.97 * m, h],
				[m, 0.95 * h],
				[m, hc],
			],
		];
	}
	if (edge === "molar") {
		return [
			[
				[-m, 0.8 * h],
				[-0.85 * m, h],
				[-0.5 * m, h],
			],
			[
				[-0.25 * m, h],
				[-0.1 * m, 0.93 * h],
				[0, 0.93 * h],
			],
			[
				[0.1 * m, 0.93 * h],
				[0.25 * m, h],
				[0.5 * m, h],
			],
			[
				[0.85 * m, h],
				[m, 0.8 * h],
				[m, hc],
			],
		];
	}
	// Single cusp: the canine is pointed, the premolar buccal cusp blunter.
	const [shoulder, spread] = edge === "cusp" ? [0.78, 0.04] : [0.88, 0.25];
	return [
		[
			[-m, 0.72 * h],
			[-0.9 * m, shoulder * h],
			[-0.7 * m, (shoulder + 0.02) * h],
		],
		[
			[-0.4 * m, 0.94 * h],
			[-spread * m, h],
			[0, h],
		],
		[
			[spread * m, h],
			[0.4 * m, 0.94 * h],
			[0.7 * m, (shoulder + 0.02) * h],
		],
		[
			[0.9 * m, shoulder * h],
			[m, 0.72 * h],
			[m, hc],
		],
	];
}

/**
 * Root outline from (-c, 0) to (c, 0), one lobe per root, furcations at
 * y = -trunk rounded into a U.
 */
function rootSegments(roots: readonly RootSpec[], c: number, trunk: number) {
	const segs: Seg[] = [];
	const axes: (readonly [Pt, Pt])[] = [];
	const span = (2 * c) / roots.length;
	const tip = span / 6; // half-width of the rounded apex
	const furcation = span / 8; // half-width of the U between roots
	let start: Pt = [-c, 0];
	roots.forEach((root, i) => {
		// Apical third bends distally (-x), as real roots do.
		const apex: Pt = [root.apex - DISTAL_CURVE * root.length, -root.length];
		const last = i === roots.length - 1;
		const end: Pt = last ? [c, 0] : [-c + span * (i + 1), -trunk];
		const leave: Pt =
			i === 0
				? [start[0], (start[1] + apex[1]) / 2]
				: [start[0] + furcation, start[1]];
		const arrive: Pt = last
			? [end[0], (end[1] + apex[1]) / 2]
			: [end[0] - furcation, end[1]];
		segs.push(
			[leave, [apex[0] - tip, apex[1]], apex],
			[[apex[0] + tip, apex[1]], arrive, end],
		);
		axes.push([
			[-c + span * (i + 0.5), 0],
			[apex[0], apex[1] + tip],
		]);
		start = end;
	});
	return { segs, axes };
}

function circle(r: number): Pt[] {
	return Array.from({ length: OUTLINE_POINTS }, (_, k) => {
		const t = (2 * Math.PI * k) / OUTLINE_POINTS;
		return [r * Math.cos(t), r * Math.sin(t)] as const;
	});
}

/** Ring sector between outline indices `from` and `to` (inclusive, wrapping). */
function sector(
	outer: readonly Pt[],
	inner: readonly Pt[],
	from: number,
	to: number,
): Pt[] {
	const idx: number[] = [from];
	while (idx[idx.length - 1] !== to) {
		idx.push((idx[idx.length - 1] + 1) % outer.length);
	}
	return [...idx.map((k) => outer[k]), ...idx.reverse().map((k) => inner[k])];
}

const fmt = (v: number) => String(Math.round(v * 100) / 100 || 0);

function bounds(points: readonly Pt[]): ViewBox {
	const xs = points.map((p) => p[0]);
	const ys = points.map((p) => p[1]);
	const x = Math.min(...xs) - PAD;
	const y = Math.min(...ys) - PAD;
	return {
		x,
		y,
		width: Math.max(...xs) + PAD - x,
		height: Math.max(...ys) + PAD - y,
	};
}

const cache = new Map<number, ToothGeometry>();

/** Geometry of one tooth, oriented for its quadrant. Throws on an invalid FDI code. */
export function getToothGeometry(fdi: number): ToothGeometry {
	const cached = cache.get(fdi);
	if (cached) {
		return cached;
	}
	const info = toothInfo(fdi);
	const t = TEMPLATES[info.dentition][info.arch][info.position - 1];
	const flip = info.arch === "lower";
	const tf = (p: Pt): Pt => [info.mirrored ? -p[0] : p[0], flip ? -p[1] : p[1]];
	const used: Pt[] = [];
	const path = (from: Pt, segs: readonly Seg[], close: boolean) => {
		const p0 = tf(from);
		used.push(p0);
		let d = `M${fmt(p0[0])} ${fmt(p0[1])}`;
		for (const seg of segs) {
			const pts = seg.map(tf);
			used.push(...pts);
			d += `C${pts.map((p) => `${fmt(p[0])} ${fmt(p[1])}`).join(" ")}`;
		}
		return close ? `${d}Z` : d;
	};

	// Lateral view
	const m = t.width / 2;
	const c = t.cervical / 2;
	const h = t.height;
	const cejDepth = CEJ_CURVE[t.edge] * h;
	const cejSeg: Seg = [
		[c / 2, -cejDepth],
		[-c / 2, -cejDepth],
		[-c, 0],
	];
	const crown = path(
		[-c, 0],
		[
			[
				[-c, 0.15 * h],
				[-m, 0.3 * h],
				[-m, CONTOUR * h],
			],
			...edgeSegments(t.edge, m, h),
			[
				[m, 0.3 * h],
				[c, 0.15 * h],
				[c, 0],
			],
			cejSeg,
		],
		true,
	);
	// Three roots = upper molar: the palatal (middle) one is seen behind the
	// two buccal roots, as in a real buccal view.
	const palatal = t.roots.length === 3 ? t.roots[1] : undefined;
	const front = palatal ? [t.roots[0], t.roots[2]] : t.roots;
	const root = rootSegments(front, c, t.trunk ?? 0);
	const roots = path([-c, 0], [...root.segs, cejSeg], true);
	const back = palatal ? rootSegments([palatal], 0.6 * c, 0) : undefined;
	const rootsBehind = back ? path([-0.6 * c, 0], back.segs, true) : "";
	const cej = path([c, 0], [cejSeg], false);
	const details = detailStrokes(t.edge, m, c, h)
		.map(([from, segs]) => path(from, segs, false))
		.join("");
	const longest = Math.max(...t.roots.map((r) => r.length));
	const lateral: LateralView = {
		viewBox: bounds(used),
		crown,
		roots,
		rootsBehind,
		cej,
		details,
		rootAxes: [...root.axes, ...(back?.axes ?? [])].map(
			([a, b]) => [tf(a), tf(b)] as const,
		),
		edgeY: tf([0, h])[1],
		apexY: tf([0, -longest])[1],
	};

	// Occlusal view (circular, as on the NTS chart): sectors bounded at 45°, 135°, 225° and 315°.
	const raw = circle(
		POSTERIOR.test(info.type) ? POSTERIOR_RADIUS : ANTERIOR_RADIUS,
	);
	const outline = raw.map(tf);
	const inner = raw.map((p) => tf([p[0] * INNER, p[1] * INNER]));
	const e = OUTLINE_POINTS / 8;
	const occlusal: OcclusalView = {
		viewBox: bounds(outline),
		outline,
		surfaces: {
			M: sector(outline, inner, 7 * e, e),
			L: sector(outline, inner, e, 3 * e),
			D: sector(outline, inner, 3 * e, 5 * e),
			V: sector(outline, inner, 5 * e, 7 * e),
			O: inner,
		},
	};

	const geometry: ToothGeometry = {
		...info,
		rootCount: t.roots.length,
		lateral,
		occlusal,
	};
	cache.set(fdi, geometry);
	return geometry;
}
