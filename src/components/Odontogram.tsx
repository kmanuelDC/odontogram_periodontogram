import {
	type CSSProperties,
	type FocusEvent,
	type KeyboardEvent,
	type SVGProps,
	useMemo,
	useRef,
	useState,
} from "react";
import { toothInfo } from "../anatomy/fdi";
import { getToothGeometry } from "../anatomy/geometry";
import type { FindingCode } from "../findings/catalog";
import {
	type Finding,
	type OdontogramValue,
	addFinding,
	findingDef,
	findingSigla,
	findingState,
	removeFinding,
} from "../findings/model";
import {
	type ChartDentition,
	type OdontogramLayout,
	type ToothSlot,
	layoutOdontogram,
} from "../layout/odontogramLayout";
import { arrow } from "./FindingLayer";
import { FindingPicker, type PickerCloseReason } from "./FindingPicker";
import { type MarkZone, type ToothMark, ToothSvg } from "./ToothSvg";
import { usePxPerMm } from "./usePxPerMm";

export interface OdontogramSelection {
	fdi: number;
	zone: MarkZone;
}

export interface OdontogramProps
	extends Omit<SVGProps<SVGSVGElement>, "children" | "ref" | "onChange"> {
	/** "mixed" is the full NTS sheet (permanent + primary). */
	dentition?: ChartDentition;
	/** Findings by FDI. Build new values with addFinding / removeFinding. */
	value?: OdontogramValue;
	/** Extra free text in a tooth's box, after the findings' siglas. */
	boxes?: Readonly<Partial<Record<number, string>>>;
	/**
	 * "select" (default): click/Enter selects a zone. "brush": the tooth gets
	 * dots; the occlusal circles still select when onSelectionChange is set.
	 */
	mode?: "select" | "brush";
	selection?: OdontogramSelection | null;
	onSelectionChange?: (selection: OdontogramSelection) => void;
	/** Brush dots for the whole chart (see ToothSvg). */
	marks?: readonly ToothMark[];
	onMarksChange?: (marks: ToothMark[]) => void;
	brushColor?: string;
	/** Fine anatomy lines. Default: automatic, from 8 px per mm on screen. */
	detail?: boolean;
	/**
	 * Built-in editing: selecting a zone opens a floating finding picker, and
	 * every add/remove calls onChange with the new value.
	 */
	onChange?: (value: OdontogramValue) => void;
	/** Findings the built-in picker may offer. Default: the whole catalogue. */
	codes?: readonly FindingCode[];
}

/** Keyboard order of zones inside a tooth (Up/Down). */
const ZONE_ORDER: readonly MarkZone[] = [
	"crown",
	"root",
	"V",
	"M",
	"O",
	"D",
	"L",
];
/** Brush without selection: the circles are inert, so they leave the keyboard order. */
const BRUSH_ORDER: readonly MarkZone[] = ["crown", "root"];
const ARROW_STEP = new Map([
	["ArrowLeft", -1],
	["ArrowRight", 1],
	["ArrowUp", -1],
	["ArrowDown", 1],
]);
const viewOf = (z: MarkZone) =>
	z === "crown" || z === "root" ? "lateral" : "occlusal";

/**
 * Each tooth's chart row (upper permanent, upper primary, lower primary,
 * lower permanent), left to right; plus the first tooth in reading order.
 */
function rows(layout: OdontogramLayout) {
	const row = (fdi: number) => {
		const { arch, dentition } = toothInfo(fdi);
		const perm = dentition === "permanent";
		if (arch === "upper") {
			return perm ? 0 : 1;
		}
		return perm ? 3 : 2;
	};
	const sorted = [...layout.teeth].sort(
		(a, b) => row(a.fdi) - row(b.fdi) || a.x - b.x,
	);
	const byFdi = new Map(
		sorted.map((t) => [t.fdi, sorted.filter((u) => row(u.fdi) === row(t.fdi))]),
	);
	return { byFdi, first: sorted[0]?.fdi };
}

/** Chart y of a tooth's CEJ, and +1/-1 pointing from the CEJ into the crown. */
function cej(slot: ToothSlot) {
	const g = getToothGeometry(slot.fdi);
	return {
		y: slot.lateral.y - g.lateral.viewBox.y,
		crown: g.arch === "upper" ? 1 : -1,
	};
}

/** Chart y just past the root tips of a and b (the longer root wins). */
function apexLine(a: ToothSlot, b: ToothSlot) {
	const { crown: s } = cej(a);
	const tip = (t: ToothSlot) =>
		cej(t).y + getToothGeometry(t.fdi).lateral.apexY;
	return (s > 0 ? Math.min(tip(a), tip(b)) : Math.max(tip(a), tip(b))) - s;
}

/** Chart y across the middle of a's crown. */
const crownLine = (a: ToothSlot) =>
	cej(a).y + getToothGeometry(a.fdi).lateral.edgeY * 0.55;

type Point = { x: number; y: number };

/** Path of a chart-level finding (and where its "S" goes), or null if it has none. */
function chartPath(
	kind: string | undefined,
	a: ToothSlot,
	b: ToothSlot | undefined,
): { d: string; s?: Point } | null {
	if (kind === "peg") {
		const { x, y } = a.label;
		return { d: `M${x} ${y - 3.4}L${x + 3.4} ${y + 2.2}H${x - 3.4}Z` };
	}
	if (kind === "numberRing") {
		const { x, y } = a.label;
		return { d: `M${x - 3} ${y}a3 2.6 0 1 0 6 0a3 2.6 0 1 0 -6 0` };
	}
	if (!b) {
		return null; // not a span, or the other tooth is not on this chart
	}
	const { y: c, crown: s } = cej(a);
	switch (kind) {
		case "bridge": {
			const y = c + s * 4;
			return {
				d: `M${a.x} ${y - s * 2}L${a.x} ${y}L${b.x} ${y}L${b.x} ${y - s * 2}`,
			};
		}
		case "orthodontic": {
			const y = c + s * 3;
			const box = (x: number) => `M${x - 1.2} ${y - 1.2}h2.4v2.4h-2.4Z`;
			return { d: `M${a.x} ${y}L${b.x} ${y}${box(a.x)}${box(b.x)}` };
		}
		case "diastema": {
			const m = (a.x + b.x) / 2;
			const [y1, y2, ym] = [c + s, c + s * 6, c + s * 3.5];
			return {
				d: `M${m - 1.2} ${y1}Q${m - 0.2} ${ym} ${m - 1.2} ${y2}M${m + 1.2} ${y1}Q${m + 0.2} ${ym} ${m + 1.2} ${y2}`,
			};
		}
		case "orthodonticRemovable": {
			const y = apexLine(a, b);
			const n = Math.max(2, Math.round(Math.abs(b.x - a.x) / 1.5));
			const zig = Array.from({ length: n + 1 }, (_, k) => {
				const x = a.x + ((b.x - a.x) * k) / n;
				return `${k ? "L" : "M"}${x} ${y + (k % 2 ? -s : 0)}`;
			});
			return { d: zig.join("") };
		}
		case "removableProsthesis":
		case "totalProsthesis": {
			const y = kind === "totalProsthesis" ? crownLine(a) : apexLine(a, b);
			return { d: `M${a.x} ${y - 0.6}H${b.x}M${a.x} ${y + 0.6}H${b.x}` };
		}
		case "edentulous":
			return { d: `M${a.x} ${crownLine(a)}H${b.x}` };
		case "fusion": {
			// Two rings around the numbers that overlap between them.
			const rx = Math.abs(b.x - a.x) / 2 + 1.5;
			const ring = (p: Point) =>
				`M${p.x - rx} ${p.y}a${rx} 2.6 0 1 0 ${2 * rx} 0a${rx} 2.6 0 1 0 ${-2 * rx} 0`;
			return { d: ring(a.label) + ring(b.label) };
		}
		case "transposition": {
			// Two curved arrows crossing between the numbers.
			const y = a.label.y;
			const curve = (x1: number, x2: number, dy: number) => {
				const cx = (x1 + x2) / 2;
				const head = arrow(x2 + (cx - x2) * 0.1, y + dy * 0.1, x2, y);
				return `M${x1} ${y}Q${cx} ${y + dy} ${x2} ${y}${head}`;
			};
			return { d: curve(a.x, b.x, -3) + curve(b.x, a.x, 3) };
		}
		case "supernumerary": {
			const m = (a.x + b.x) / 2;
			const y = apexLine(a, b) - s * 2;
			return {
				d: `M${m - 2} ${y}a2 2 0 1 0 4 0a2 2 0 1 0 -4 0`,
				s: { x: m, y },
			};
		}
		default:
			return null;
	}
}

/** Findings drawn on the chart outside one tooth view: spans and the number triangle. */
function SpanLayer({
	value,
	slots,
}: {
	value: OdontogramValue;
	slots: Map<number, ToothSlot>;
}) {
	const spans = Object.entries(value).flatMap(([key, list]) =>
		(list ?? []).map((f) => [Number(key), f] as const),
	);
	return (
		<g className="odp-findings">
			{spans.map(([fdi, f], i) => {
				const a = slots.get(fdi);
				const b = f.to === undefined ? undefined : slots.get(f.to);
				const path = a ? chartPath(findingDef(f)?.kind, a, b) : null;
				if (!path) {
					return null;
				}
				return (
					<g
						// biome-ignore lint/suspicious/noArrayIndexKey: findings may repeat
						key={i}
						className={`odp-f odp-f-${findingState(f)}`}
						data-finding={f.code}
					>
						<path d={path.d} />
						{path.s ? (
							<text
								className="odp-f-fill odp-box-text"
								x={path.s.x}
								y={path.s.y}
							>
								S
							</text>
						) : null}
					</g>
				);
			})}
		</g>
	);
}

/** Box text: siglas coloured by state, then the free text. Shrinks to fit. */
function BoxText({
	slot,
	findings,
	extra,
}: { slot: ToothSlot; findings: readonly Finding[]; extra?: string }) {
	const parts = findings
		.filter((f) => findingDef(f)?.kind !== "rootSigla") // drawn on the root
		.map((f) => [findingSigla(f), findingState(f)] as const)
		.filter(([sigla]) => sigla);
	const length = [...parts.map(([t]) => t), extra ?? ""].join(" ").length;
	const size = Math.min(
		3,
		(slot.box.width * 0.9) / (0.62 * Math.max(length, 1)),
	);
	return (
		<text
			className="odp-box-text"
			x={slot.x}
			y={slot.box.y + slot.box.height / 2}
			style={{ fontSize: size }}
		>
			{parts.map(([sigla, state], i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: siglas may repeat
				<tspan key={i} className={`odp-box-${state}`}>
					{i ? ` ${sigla}` : sigla}
				</tspan>
			))}
			{extra ? <tspan>{parts.length > 0 ? ` ${extra}` : extra}</tspan> : null}
		</text>
	);
}

/**
 * Places the picker next to the zone, in % of the chart so it follows resizing:
 * below it on the upper arch, above it on the lower, and away from the edges.
 */
function pickerPosition(
	layout: OdontogramLayout,
	r: { x: number; y: number; width: number; height: number },
): CSSProperties {
	const left = r.x + r.width / 2 < layout.width / 2;
	const upper = r.y + r.height <= layout.occlusalPlaneY;
	const pct = (v: number, of: number) => `${(v / of) * 100}%`;
	return {
		...(left
			? { left: pct(r.x, layout.width) }
			: { right: pct(layout.width - r.x - r.width, layout.width) }),
		...(upper
			? { top: pct(r.y + r.height, layout.height) }
			: { bottom: pct(layout.height - r.y, layout.height) }),
	};
}

/** The zone that holds the chart's single Tab stop. */
function rovingZone(
	active: OdontogramSelection | null,
	slots: ReadonlyMap<number, ToothSlot>,
	first: number | undefined,
	brushOnly: boolean,
): OdontogramSelection | null {
	if (active && slots.has(active.fdi)) {
		// Brush without selection: the circles are inert, fall back to the crown.
		return brushOnly && viewOf(active.zone) === "occlusal"
			? { fdi: active.fdi, zone: "crown" }
			: active;
	}
	if (first === undefined) {
		return null;
	}
	return { fdi: first, zone: brushOnly ? "crown" : "O" };
}

/** The floating finding picker of a selected zone. */
function PickerLayer({
	layout,
	slot,
	at,
	value,
	codes,
	onChange,
	onClose,
}: {
	layout: OdontogramLayout;
	slot: ToothSlot | undefined;
	at: OdontogramSelection;
	value: OdontogramValue;
	codes: readonly FindingCode[] | undefined;
	onChange: (value: OdontogramValue) => void;
	onClose: (reason: PickerCloseReason) => void;
}) {
	if (!slot) {
		return null;
	}
	return (
		<FindingPicker
			key={`${at.fdi}-${at.zone}`}
			fdi={at.fdi}
			zone={at.zone}
			findings={value[at.fdi] ?? []}
			chart={value}
			codes={codes}
			onAdd={(f) => onChange(addFinding(value, at.fdi, f))}
			onRemove={(i) => onChange(removeFinding(value, at.fdi, i))}
			onClose={onClose}
			style={pickerPosition(
				layout,
				viewOf(at.zone) === "lateral" ? slot.lateral : slot.occlusal,
			)}
		/>
	);
}

/** Full odontogram: one responsive SVG laid out like the NTS (MINSA Peru) sheet. */
export function Odontogram({
	dentition = "mixed",
	value = {},
	boxes = {},
	mode = "select",
	selection,
	onSelectionChange,
	marks,
	onMarksChange,
	brushColor,
	detail,
	onChange,
	codes,
	...rest
}: OdontogramProps) {
	const layout = useMemo(() => layoutOdontogram(dentition), [dentition]);
	const slots = useMemo(
		() => new Map(layout.teeth.map((t) => [t.fdi, t])),
		[layout],
	);
	const { byFdi: rowOf, first } = useMemo(() => rows(layout), [layout]);
	const ref = useRef<SVGSVGElement>(null);
	const pxPerMm = usePxPerMm(ref, layout.width);
	const brushing = mode === "brush" && Boolean(onMarksChange);
	// The brush paints the tooth; the circles keep selecting if the host listens.
	const selecting = Boolean(onSelectionChange || onChange);
	const [picker, setPicker] = useState<OdontogramSelection | null>(null);
	// Uncontrolled selection: the open picker marks the zone.
	const selected = selection === undefined ? picker : selection;
	const select = (next: OdontogramSelection) => {
		onSelectionChange?.(next);
		if (onChange) {
			setPicker(next);
		}
	};
	const brushOnly = brushing && !selecting;

	// Roving focus: one Tab stop for the whole chart; arrows move inside it.
	const [active, setActive] = useState<OdontogramSelection | null>(null);
	const current = rovingZone(active, slots, first, brushOnly);

	const focusZone = (next: OdontogramSelection) => {
		setActive(next);
		ref.current
			?.querySelector<SVGElement>(
				`svg[data-fdi="${next.fdi}"][data-view="${viewOf(next.zone)}"] [data-zone="${next.zone}"][role="button"]`,
			)
			?.focus();
	};
	const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
		rest.onKeyDown?.(e);
		const target = e.target as SVGElement;
		const zone = target.dataset.zone as MarkZone | undefined;
		const fdi = Number(
			target.closest<SVGElement>("svg[data-fdi]")?.dataset.fdi,
		);
		const row = rowOf.get(fdi);
		if (!(zone && row)) {
			return;
		}
		const step = ARROW_STEP.get(e.key);
		if (step === undefined) {
			return;
		}
		e.preventDefault();
		if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
			const i = row.findIndex((t) => t.fdi === fdi) + step;
			if (row[i]) {
				focusZone({ fdi: row[i].fdi, zone });
			}
			return;
		}
		const order = brushOnly ? BRUSH_ORDER : ZONE_ORDER;
		const z = order[order.indexOf(zone) + step];
		if (z) {
			focusZone({ fdi, zone: z });
		}
	};
	const onFocus = (e: FocusEvent<SVGSVGElement>) => {
		rest.onFocus?.(e);
		const target = e.target as SVGElement;
		const zone = target.dataset.zone as MarkZone | undefined;
		const fdi = Number(
			target.closest<SVGElement>("svg[data-fdi]")?.dataset.fdi,
		);
		if (zone && slots.has(fdi)) {
			setActive({ fdi, zone });
		}
	};

	const shared = {
		pxPerMm,
		detail,
		marks,
		...(brushing ? { onMarksChange, brushColor } : {}),
	};
	const chart = (
		<svg
			ref={ref}
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			className="odp-odontogram"
			// biome-ignore lint/a11y/useSemanticElements: an <svg> cannot be a <fieldset>
			role="group"
			aria-label="Odontograma"
			{...rest}
			onKeyDown={onKeyDown}
			onFocus={onFocus}
		>
			<line
				className="odp-midline"
				x1={layout.midlineX}
				x2={layout.midlineX}
				y1={layout.teethTop}
				y2={layout.teethBottom}
			/>
			<line
				className="odp-occlusal-plane"
				x1={0}
				x2={layout.width}
				y1={layout.occlusalPlaneY}
				y2={layout.occlusalPlaneY}
			/>
			{layout.teeth.map((t) => {
				const findings = value[t.fdi] ?? [];
				const tooth = (view: "lateral" | "occlusal") => ({
					...shared,
					findings,
					...(selecting && (view === "occlusal" || !brushing)
						? {
								onZoneSelect: (zone: MarkZone) => select({ fdi: t.fdi, zone }),
								selectedZone: selected?.fdi === t.fdi ? selected.zone : null,
							}
						: {}),
					tabbableZone:
						current?.fdi === t.fdi && viewOf(current.zone) === view
							? current.zone
							: null,
				});
				return (
					<g
						key={t.fdi}
						data-fdi={t.fdi}
						className={selected?.fdi === t.fdi ? "odp-selected" : undefined}
					>
						<rect className="odp-box" {...t.box} />
						<BoxText slot={t} findings={findings} extra={boxes[t.fdi]} />
						<text className="odp-number" x={t.label.x} y={t.label.y}>
							{t.fdi}
						</text>
						<ToothSvg
							fdi={t.fdi}
							view="lateral"
							{...tooth("lateral")}
							{...t.lateral}
						/>
						<ToothSvg
							fdi={t.fdi}
							view="occlusal"
							{...tooth("occlusal")}
							{...t.occlusal}
						/>
					</g>
				);
			})}
			<SpanLayer value={value} slots={slots} />
		</svg>
	);
	if (!onChange) {
		return chart;
	}
	const close = (reason: PickerCloseReason) => {
		const at = picker;
		setPicker(null);
		// After an outside click the user is already elsewhere: keep their focus.
		if (at && reason !== "outside") {
			focusZone(at);
		}
	};
	return (
		<div className="odp-odontogram-wrap">
			{chart}
			{picker ? (
				<PickerLayer
					layout={layout}
					slot={slots.get(picker.fdi)}
					at={picker}
					value={value}
					codes={codes}
					onChange={onChange}
					onClose={close}
				/>
			) : null}
		</div>
	);
}
