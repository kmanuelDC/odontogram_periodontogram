import type { CSSProperties, KeyboardEvent, MouseEvent, SVGProps } from "react";
import {
	GEOMETRY_VERSION,
	type Pt,
	SURFACES,
	type Surface,
	getToothGeometry,
} from "../anatomy/geometry";
import { type Finding, describeFindings } from "../findings/model";
import { FindingLayer } from "./FindingLayer";

export type ToothView = "lateral" | "occlusal";
export type MarkZone = Surface | "crown" | "root";

/** A brush dot. Plain JSON: store it as is and pass it back in `marks`. */
export interface ToothMark {
	fdi: number;
	view: ToothView;
	/** Position in tooth millimetres (same space as the geometry), not pixels. */
	x: number;
	y: number;
	/** Where it landed: occlusal surface code, or crown / root in the lateral view. */
	zone: MarkZone;
	color?: string;
	/** GEOMETRY_VERSION when the mark was made: compare it to detect drift. */
	geometryVersion: number;
}

export interface ToothSvgProps extends SVGProps<SVGSVGElement> {
	fdi: number;
	view?: ToothView;
	/** Pixels per millimetre; keeps real proportions between teeth. */
	pxPerMm?: number;
	/** Fine anatomy lines. Default: only from 8 px/mm, where they don't clutter. */
	detail?: boolean;
	/** Brush dots. May hold marks of other teeth/views: only matching ones are drawn. */
	marks?: readonly ToothMark[];
	/**
	 * Enables the brush (lateral view only): click on the tooth (or Enter/Space on a focused zone)
	 * adds a dot; click on a dot (or Enter/Delete) removes it.
	 */
	onMarksChange?: (marks: ToothMark[]) => void;
	/** Colour of new dots. Default: the theme's --odp-red. */
	brushColor?: string;
	/** Findings of this tooth (NTS), drawn in red/blue. */
	findings?: readonly Finding[];
	/** Selection mode (ignored while the brush is on): click / Enter on a zone. */
	onZoneSelect?: (zone: MarkZone) => void;
	selectedZone?: MarkZone | null;
	/**
	 * Roving focus: only this zone is in the Tab order (null: none).
	 * Undefined: every zone is. The chart uses it to keep one Tab stop.
	 */
	tabbableZone?: MarkZone | null;
}

const MARK_RADIUS = 0.8; // mm
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export const ZONE_NAMES: Record<MarkZone, string> = {
	V: "vestibular",
	L: "lingual/palatina",
	M: "mesial",
	D: "distal",
	O: "oclusal/incisal",
	crown: "corona",
	root: "raíz",
};

const points = (pts: readonly Pt[]) => pts.map((p) => p.join(",")).join(" ");
const round = (v: number) => Math.round(v * 100) / 100;
const activates = (e: KeyboardEvent, keys: string[]) => {
	if (!keys.includes(e.key)) {
		return false;
	}
	e.preventDefault();
	return true;
};

/** One anatomical tooth, side (crown + roots) or occlusal (5 surfaces) view. */
export function ToothSvg({
	fdi,
	view = "lateral",
	pxPerMm = 4,
	detail = pxPerMm >= 8,
	marks = [],
	onMarksChange,
	brushColor,
	findings = [],
	onZoneSelect,
	selectedZone,
	tabbableZone,
	...rest
}: ToothSvgProps) {
	const g = getToothGeometry(fdi);
	const vb = g[view].viewBox;
	// Stroke follows the drawing size: thin when small, firmer when large.
	const stroke = Math.min(1.6, Math.max(0.9, pxPerMm * 0.13));
	// The brush paints the tooth itself; the occlusal circle only selects.
	const brush = view === "lateral" ? onMarksChange : undefined;
	const interactive = Boolean(brush || onZoneSelect);
	const own = marks.filter((m) => m.fdi === fdi && m.view === view);
	const remove = (mark: ToothMark) => brush?.(marks.filter((m) => m !== mark));

	const add = (zone: MarkZone, x: number, y: number) =>
		brush?.([
			...marks,
			{
				fdi,
				view,
				x: round(x),
				y: round(y),
				zone,
				...(brushColor ? { color: brushColor } : {}),
				geometryVersion: GEOMETRY_VERSION,
			},
		]);

	const paint = (e: MouseEvent<SVGSVGElement>) => {
		rest.onClick?.(e);
		const zone = (e.target as SVGElement).dataset.zone as MarkZone | undefined;
		if (!zone) {
			return; // the click missed the tooth
		}
		if (!brush) {
			onZoneSelect?.(zone);
			return;
		}
		const box = e.currentTarget.getBoundingClientRect();
		add(
			zone,
			vb.x + ((e.clientX - box.left) * vb.width) / box.width,
			vb.y + ((e.clientY - box.top) * vb.height) / box.height,
		);
	};

	/** Keyboard: a dot near the zone centre, spiralling out so repeats do not stack. */
	// shortcut: the spiral can leave very small zones after many dots; clamp to the zone if that matters.
	const addByKey = (zone: MarkZone) => {
		const [ax, bx] = g.lateral.rootAxes[0];
		const c: Pt =
			zone === "crown"
				? [0, g.lateral.edgeY / 2]
				: [(ax[0] + bx[0]) / 2, (ax[1] + bx[1]) / 2];
		const n = own.filter((m) => m.zone === zone).length;
		const r = 0.9 * Math.sqrt(n);
		add(
			zone,
			c[0] + r * Math.cos(n * GOLDEN_ANGLE),
			c[1] + r * Math.sin(n * GOLDEN_ANGLE),
		);
	};

	/** Zone attributes; focusable buttons only when the tooth is interactive. */
	const zone = (z: MarkZone) => ({
		"data-zone": z,
		...(selectedZone === z ? { "data-selected": true } : {}),
		...(interactive
			? {
					role: "button",
					tabIndex: tabbableZone === undefined || tabbableZone === z ? 0 : -1,
					"aria-label": brush
						? `Agregar marca en ${ZONE_NAMES[z]}, diente ${fdi}`
						: `Diente ${fdi}, ${ZONE_NAMES[z]}`,
					...(brush ? {} : { "aria-pressed": selectedZone === z }),
					onKeyDown: (e: KeyboardEvent) =>
						activates(e, ["Enter", " "]) &&
						(brush ? addByKey(z) : onZoneSelect?.(z)),
				}
			: {}),
	});

	return (
		<svg
			viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`}
			width={vb.width * pxPerMm}
			height={vb.height * pxPerMm}
			className={`odp-tooth${brush ? " odp-brush" : onZoneSelect ? " odp-select" : ""}`}
			data-fdi={fdi}
			data-view={view}
			// "img" hides its children from assistive tech: interactive teeth are groups.
			role={interactive ? "group" : "img"}
			shapeRendering="geometricPrecision"
			aria-label={`Diente ${fdi}${findings.length > 0 ? `: ${describeFindings(findings)}` : ""}`}
			{...rest}
			onClick={paint}
			style={
				{ "--odp-auto-stroke": `${stroke}px`, ...rest.style } as CSSProperties
			}
		>
			{view === "lateral" ? (
				<>
					{g.lateral.rootsBehind ? (
						<path
							className="odp-root"
							d={g.lateral.rootsBehind}
							data-zone="root"
						/>
					) : null}
					<path className="odp-root" d={g.lateral.roots} {...zone("root")} />
					<path className="odp-crown" d={g.lateral.crown} {...zone("crown")} />
					{detail ? (
						<path className="odp-detail" d={g.lateral.details} />
					) : null}
				</>
			) : (
				<>
					{SURFACES.map((s) => (
						<polygon
							key={s}
							className="odp-surface"
							data-surface={s}
							{...zone(s)}
							points={points(g.occlusal.surfaces[s])}
						/>
					))}
					<polygon
						className="odp-outline"
						points={points(g.occlusal.outline)}
					/>
				</>
			)}
			<FindingLayer findings={findings} g={g} view={view} />
			{own.map((m, i) => (
				<circle
					// biome-ignore lint/suspicious/noArrayIndexKey: dots may share coordinates
					key={i}
					className="odp-mark"
					cx={m.x}
					cy={m.y}
					r={MARK_RADIUS}
					style={m.color ? { fill: m.color } : undefined}
					{...(brush
						? {
								role: "button",
								tabIndex: 0,
								"aria-label": `Quitar marca en ${ZONE_NAMES[m.zone]}, diente ${fdi}`,
								onClick: (e: MouseEvent) => {
									e.stopPropagation();
									remove(m);
								},
								onKeyDown: (e: KeyboardEvent) =>
									activates(e, ["Enter", " ", "Delete", "Backspace"]) &&
									remove(m),
							}
						: {})}
				/>
			))}
		</svg>
	);
}
