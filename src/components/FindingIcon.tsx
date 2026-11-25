import { getToothGeometry } from "../anatomy/geometry";
import {
	type Finding,
	findingDef,
	findingSigla,
	findingState,
} from "../findings/model";
import { ToothSvg, type ToothView } from "./ToothSvg";

/** Kinds that read best on the circle; the rest are drawn on the side view. */
const OCCLUSAL_KINDS = new Set([
	"surface",
	"surfaceOutline",
	"cross",
	"crown",
	"rotation",
	"migration",
]);

/** Chart-level symbols (spans, number triangle) in a 24×24 box, same strokes as the chart. */
const SPAN_PATHS: Record<string, string> = {
	bridge: "M3 8V15H21V8",
	orthodontic: "M3 12H21M1.5 10.5h3v3h-3ZM19.5 10.5h3v3h-3Z",
	diastema: "M10 4Q12.5 12 10 20M14 4Q11.5 12 14 20",
	orthodonticRemovable: "M2 14L5 10L8 14L11 10L14 14L17 10L20 14L22 11",
	removableProsthesis: "M2 10H22M2 14H22",
	totalProsthesis: "M2 10H22M2 14H22",
	edentulous: "M2 12H22",
	gemination:
		"M2 12a6 5 0 1 0 12 0a6 5 0 1 0 -12 0M10 12a6 5 0 1 0 12 0a6 5 0 1 0 -12 0",
	transposition:
		"M4 12Q12 4 20 12M20 12l-3.5 -0.5M20 12l-1 -3.4M20 12Q12 20 4 12M4 12l3.5 0.5M4 12l1 3.4",
	supernumerary:
		"M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0M15 8.5Q12 6.5 9.5 8.3Q8.5 11 12 12Q15.5 13 14.5 15.7Q12 17.5 9 15.5",
	peg: "M12 3L21 20H3Z",
};

/**
 * The NTS symbol of a finding, drawn as on the chart (red/blue by state).
 * Decorative: pair it with the finding's name.
 */
export function FindingIcon({
	fdi,
	finding,
	size = 28,
}: { fdi: number; finding: Finding; size?: number }) {
	const kind = findingDef(finding)?.kind ?? "sigla";
	const state = findingState(finding);
	const box = { width: size, height: size };

	if (kind in SPAN_PATHS) {
		return (
			<svg className="odp-icon" viewBox="0 0 24 24" {...box} aria-hidden={true}>
				<g className={`odp-f odp-f-${state}`}>
					<path d={SPAN_PATHS[kind]} />
				</g>
			</svg>
		);
	}
	if (kind === "sigla") {
		return (
			<span
				className={`odp-icon odp-icon-sigla odp-f-${state}`}
				style={box}
				aria-hidden={true}
			>
				{findingSigla(finding)}
			</span>
		);
	}
	const view: ToothView = OCCLUSAL_KINDS.has(kind) ? "occlusal" : "lateral";
	const vb = getToothGeometry(fdi)[view].viewBox;
	return (
		<span className="odp-icon" style={box} aria-hidden={true}>
			<ToothSvg
				fdi={fdi}
				view={view}
				pxPerMm={size / Math.max(vb.width, vb.height)}
				detail={false}
				findings={[finding]}
			/>
		</span>
	);
}
