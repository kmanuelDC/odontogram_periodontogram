import type { Pt, ToothGeometry } from "../anatomy/geometry";
import {
	type Finding,
	findingDef,
	findingSigla,
	findingState,
} from "../findings/model";
import type { ToothView } from "./ToothSvg";

const HEAD = 1; // mm, arrowhead size

const points = (pts: readonly Pt[]) => pts.map((p) => p.join(",")).join(" ");

/** Straight arrow from (x1, y1) to (x2, y2). */
export function arrow(x1: number, y1: number, x2: number, y2: number) {
	const a = Math.atan2(y2 - y1, x2 - x1);
	const h = (da: number) =>
		`${x2 - HEAD * Math.cos(a + da)} ${y2 - HEAD * Math.sin(a + da)}`;
	return `M${x1} ${y1}L${x2} ${y2}M${h(0.5)}L${x2} ${y2}L${h(-0.5)}`;
}

/** Inset box corners of a view: [x0, y0, x1, y1]. */
function inset(g: ToothGeometry, view: ToothView, by: number) {
	const b = g[view].viewBox;
	return [b.x + by, b.y + by, b.x + b.width - by, b.y + b.height - by];
}

function lateralShape(f: Finding, g: ToothGeometry) {
	const { lateral } = g;
	const [x0, y0, x1, y1] = inset(g, "lateral", 1);
	switch (findingDef(f)?.kind) {
		case "cross":
			return <path d={`M${x0} ${y0}L${x1} ${y1}M${x1} ${y0}L${x0} ${y1}`} />;
		case "crown":
			return <path className="odp-f-thick" d={lateral.crown} />;
		case "rootCanal":
			return (
				<path
					d={lateral.rootAxes
						.map(([a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`)
						.join("")}
				/>
			);
		case "implant": {
			const [a, b] = lateral.rootAxes[0];
			const ticks = [0.25, 0.5, 0.75].map((t) => {
				const x = a[0] + (b[0] - a[0]) * t;
				const y = a[1] + (b[1] - a[1]) * t;
				return `M${x - 1.2} ${y}L${x + 1.2} ${y}`;
			});
			return (
				<path
					className="odp-f-thick"
					d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}${ticks.join("")}`}
				/>
			);
		}
		case "extrusion":
			return (
				<path d={arrow(0, lateral.apexY * 0.85, 0, lateral.apexY * 0.3)} />
			);
		case "intrusion":
			return (
				<path d={arrow(0, lateral.apexY * 0.3, 0, lateral.apexY * 0.85)} />
			);
		case "eruption": {
			// Zigzag toward the occlusal plane.
			const ys = [0.9, 0.78, 0.66, 0.54, 0.42].map((t) => lateral.apexY * t);
			const zig = ys.map((y, i) => `${i ? "L" : "M"}${i % 2 ? 1 : -1} ${y}`);
			return (
				<path
					d={`${zig.join("")}${arrow(-1, ys[4], 0, lateral.apexY * 0.25)}`}
				/>
			);
		}
		case "rootSigla": {
			const [a, b] = lateral.rootAxes[0];
			return (
				<text
					className="odp-f-fill odp-box-text"
					x={(a[0] + b[0]) / 2}
					y={(a[1] + b[1]) / 2}
				>
					{findingSigla(f)}
				</text>
			);
		}
		case "fracture": {
			const y = f.location === "root" ? lateral.apexY : lateral.edgeY;
			const [from, to] = f.location === "root" ? [0.4, 0.7] : [0.35, 0.85];
			return <path d={`M${x0} ${y * from}L${x1} ${y * to}`} />;
		}
		case "postCore": {
			const cy = lateral.edgeY * 0.5;
			const h = 1.2 * Math.sign(lateral.edgeY);
			const [a, b] = lateral.rootAxes[0];
			const tip = [a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7];
			return (
				<path
					className="odp-f-thick"
					d={`M-1.2 ${cy - 1.2}h2.4v2.4h-2.4ZM0 ${cy - h}L${a[0]} ${a[1]}L${tip[0]} ${tip[1]}`}
				/>
			);
		}
		default:
			return null;
	}
}

function occlusalShape(f: Finding, g: ToothGeometry) {
	const { occlusal } = g;
	const [x0, y0, x1, y1] = inset(g, "occlusal", 1.5);
	const r = occlusal.viewBox.width / 2 - 1; // outline radius
	switch (findingDef(f)?.kind) {
		case "surface":
		case "surfaceOutline":
			return (
				<>
					{(f.surfaces ?? []).map((s) =>
						occlusal.surfaces[s] ? (
							<polygon
								key={s}
								className={
									findingDef(f)?.kind === "surface"
										? "odp-f-fill"
										: "odp-f-thick"
								}
								points={points(occlusal.surfaces[s])}
							/>
						) : null,
					)}
				</>
			);
		case "cross":
			return <path d={`M${x0} ${y0}L${x1} ${y1}M${x1} ${y0}L${x0} ${y1}`} />;
		case "crown":
			return (
				<polygon className="odp-f-thick" points={points(occlusal.outline)} />
			);
		case "rotation": {
			const R = r + 0.7;
			const at = (deg: number) => {
				const a = (deg * Math.PI) / 180;
				return [R * Math.cos(a), R * Math.sin(a)] as const;
			};
			const [sx, sy] = at(200);
			const [ex, ey] = at(340);
			const [px, py] = at(325);
			return (
				<path
					d={`M${sx} ${sy}A${R} ${R} 0 0 1 ${ex} ${ey}${arrow(px, py, ex, ey)}`}
				/>
			);
		}
		case "migration": {
			// Mesial is +x unless the tooth is mirrored.
			const toMesial = (f.direction ?? "mesial") === "mesial";
			const sign = (g.mirrored ? -1 : 1) * (toMesial ? 1 : -1);
			return <path d={arrow(-sign * 0.6 * r, 0, sign * 0.6 * r, 0)} />;
		}
		default:
			return null;
	}
}

/** Findings drawn on one tooth view, in tooth millimetres. */
export function FindingLayer({
	findings,
	g,
	view,
}: {
	findings: readonly Finding[];
	g: ToothGeometry;
	view: ToothView;
}) {
	return (
		<g className="odp-findings">
			{findings.map((f, i) => {
				const shape =
					view === "lateral" ? lateralShape(f, g) : occlusalShape(f, g);
				return shape ? (
					<g
						// biome-ignore lint/suspicious/noArrayIndexKey: a tooth may repeat a finding
						key={i}
						className={`odp-f odp-f-${findingState(f)}`}
						data-finding={f.code}
					>
						{shape}
					</g>
				) : null;
			})}
		</g>
	);
}
