import {
	type ChangeEvent,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { type Arch, toothInfo } from "../anatomy/fdi";
import { getToothGeometry } from "../anatomy/geometry";
import type { OdontogramValue } from "../findings/model";
import { perioWithOdontogram } from "../integration/patient";
import {
	type FurcationEntrance,
	type PerioChart,
	type PerioSite,
	type PerioTooth,
	type Site,
	furcationEntrances,
	perioSummary,
	setPerioSite,
	setPerioTooth,
} from "../perio/model";
import { ToothSvg } from "./ToothSvg";
import { usePxPerMm } from "./usePxPerMm";

export interface PeriodontogramProps {
	value: PerioChart;
	/** Omit for a read-only chart. */
	onChange?: (value: PerioChart) => void;
	/**
	 * The patient's odontogram: teeth it records as missing or implants are
	 * shown and locked as such here (derived, not written into `value`).
	 */
	odontogram?: OdontogramValue;
	className?: string;
}

type Face = "V" | "L";

const COL = 13; // mm per tooth column (same grid as the odontogram)
const MID = 3; // midline gap
const WIDTH = 16 * COL + MID;
const GRID_MM = 12; // mm lines drawn on the root side of the CEJ

const ARCH_TEETH: Record<Arch, number[]> = {
	upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
	lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

/** [mesial, mid, distal] sites of a face. */
const FACE_SITES: Record<Face, readonly [Site, Site, Site]> = {
	V: ["MV", "V", "DV"],
	L: ["ML", "L", "DL"],
};

const FACE_NAME = (arch: Arch, face: Face) =>
	face === "V"
		? `vestibular ${arch === "upper" ? "superior" : "inferior"}`
		: arch === "upper"
			? "palatina superior"
			: "lingual inferior";

/** Sites of a face as seen left to right on the chart (mesial toward the midline). */
const sitesLeftToRight = (fdi: number, face: Face): Site[] => {
	const [m, mid, d] = FACE_SITES[face];
	return toothInfo(fdi).mirrored ? [m, mid, d] : [d, mid, m];
};

/** Furcation entrances probed from this face. */
const faceEntrances = (fdi: number, face: Face): FurcationEntrance[] =>
	furcationEntrances(fdi).filter((e) => (face === "V" ? e === "V" : e !== "V"));

const colX = (i: number) =>
	i < 8 ? (i + 0.5) * COL : 8 * COL + MID + (i - 7.5) * COL;

/** x of site k (0..2, left to right): centred under its input. */
const siteX = (i: number, k: number) => colX(i) + ((k - 1) * COL) / 3;

const SIGNED = /^-?\d{0,2}$/;
const UNSIGNED = /^\d{0,2}$/;

/** Moves focus to the next enabled input of the same row. */
function advance(el: HTMLInputElement) {
	const row = el.dataset.row;
	const inputs = [
		...(el
			.closest(".odp-perio")
			?.querySelectorAll<HTMLInputElement>(
				`input[data-row="${row}"]:not(:disabled)`,
			) ?? []),
	];
	const next = inputs[inputs.indexOf(el) + 1];
	next?.focus();
	next?.select();
}

/**
 * Number cell with auto-advance. One digit moves on, except a lone "1" (could
 * become 10–19, when `twoDigits`) or "-" (negative MG): those wait for more.
 * Enter also moves on.
 */
function NumInput({
	value,
	label,
	row,
	disabled,
	readOnly,
	twoDigits,
	negative,
	onCommit,
}: {
	value: number | undefined;
	label: string;
	row: string;
	disabled: boolean;
	readOnly: boolean;
	twoDigits?: boolean;
	negative?: boolean;
	/** Returns false when the value is out of range (not saved). */
	onCommit: (v: number | undefined) => boolean;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	const [invalid, setInvalid] = useState(false);
	const pattern = negative ? SIGNED : UNSIGNED;

	const change = (e: ChangeEvent<HTMLInputElement>) => {
		const text = e.target.value.trim();
		if (!pattern.test(text)) {
			return;
		}
		setDraft(text);
		if (text === "-") {
			return;
		}
		const ok = onCommit(text === "" ? undefined : Number(text));
		setInvalid(!ok);
		const digits = text.replace("-", "");
		const waits = twoDigits && digits === "1";
		if (ok && digits.length > 0 && !waits) {
			advance(e.currentTarget);
		}
	};
	const key = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			advance(e.currentTarget);
		}
	};
	return (
		<input
			className="odp-perio-input"
			inputMode="numeric"
			aria-label={label}
			aria-invalid={invalid || undefined}
			data-row={row}
			disabled={disabled}
			readOnly={readOnly}
			value={draft ?? (value === undefined ? "" : String(value))}
			onChange={change}
			onKeyDown={key}
			onFocus={(e) => e.currentTarget.select()}
			onBlur={() => setDraft(null)}
		/>
	);
}

function Toggle({
	on,
	label,
	kind,
	disabled,
	onToggle,
}: {
	on: boolean;
	label: string;
	kind: string;
	disabled: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			className={`odp-perio-toggle odp-perio-${kind}`}
			aria-pressed={on}
			aria-label={label}
			disabled={disabled}
			onClick={onToggle}
		/>
	);
}

/** One labelled row: a cell per tooth, aligned with the teeth strip. */
function Row({
	label,
	teeth,
	missing,
	cell,
}: {
	label: string;
	teeth: number[];
	missing: (fdi: number) => boolean;
	cell: (fdi: number) => ReactNode;
}) {
	return (
		<div className="odp-perio-row">
			<div className="odp-perio-label">{label}</div>
			{teeth.map((fdi, i) => (
				<div
					key={fdi}
					className={
						missing(fdi) ? "odp-perio-cell odp-perio-absent" : "odp-perio-cell"
					}
					style={{ gridColumn: i < 8 ? i + 2 : i + 3 }}
				>
					{cell(fdi)}
				</div>
			))}
		</div>
	);
}

/** Teeth of one face with the margin (red) and pocket bottom (blue) lines. */
function Strip({
	arch,
	face,
	chart,
}: {
	arch: Arch;
	face: Face;
	chart: PerioChart;
}) {
	const ref = useRef<SVGSVGElement>(null);
	const pxPerMm = usePxPerMm(ref, WIDTH);
	const teeth = ARCH_TEETH[arch];
	const geoms = teeth.map((f) => getToothGeometry(f).lateral);
	const top = Math.min(...geoms.map((g) => g.viewBox.y));
	const bottom = Math.max(...geoms.map((g) => g.viewBox.y + g.viewBox.height));
	const toRoot = arch === "upper" ? -1 : 1; // y direction from the CEJ to the apex

	// Graph points in tooth millimetres: CEJ = 0, recession (+MG) toward the root.
	type P = { x: number; margin: number; pocket: number };
	const segments: P[][] = [[]];
	teeth.forEach((fdi, i) => {
		const tooth = chart[fdi];
		sitesLeftToRight(fdi, face).forEach((site, k) => {
			const s: PerioSite | undefined = tooth?.sites?.[site];
			if (tooth?.missing || (s?.pd === undefined && s?.gm === undefined)) {
				segments.push([]); // gap: break the lines
				return;
			}
			const gm = s.gm ?? 0;
			segments[segments.length - 1].push({
				x: siteX(i, k),
				margin: toRoot * gm,
				pocket: toRoot * (gm + (s.pd ?? 0)),
			});
		});
	});
	const line = (pts: P[], key: "margin" | "pocket") =>
		pts.map((p) => `${p.x},${p[key]}`).join(" ");

	return (
		<svg
			ref={ref}
			className="odp-perio-strip"
			viewBox={`0 ${top} ${WIDTH} ${bottom - top}`}
			role="img"
			aria-label={`Dientes y gráfica, cara ${FACE_NAME(arch, face)}`}
		>
			{Array.from({ length: GRID_MM }, (_, mm) => (
				<line
					// biome-ignore lint/suspicious/noArrayIndexKey: the index is the millimetre itself
					key={mm}
					className={
						(mm + 1) % 5 === 0
							? "odp-perio-grid odp-perio-grid-5"
							: "odp-perio-grid"
					}
					x1={0}
					x2={WIDTH}
					y1={toRoot * (mm + 1)}
					y2={toRoot * (mm + 1)}
				/>
			))}
			{teeth.map((fdi, i) => {
				const vb = geoms[i].viewBox;
				return (
					<ToothSvg
						key={fdi}
						fdi={fdi}
						pxPerMm={pxPerMm}
						detail={false}
						x={colX(i) + vb.x}
						y={vb.y}
						width={vb.width}
						height={vb.height}
						opacity={chart[fdi]?.missing ? 0.2 : 1}
					/>
				);
			})}
			<line className="odp-perio-cej" x1={0} x2={WIDTH} y1={0} y2={0} />
			{segments
				.filter((s) => s.length > 0)
				.map((s) => (
					<g key={`${s[0].x}`}>
						<polygon
							className="odp-perio-pocket-area"
							points={`${line(s, "margin")} ${line([...s].reverse(), "pocket")}`}
						/>
						<polyline className="odp-perio-margin" points={line(s, "margin")} />
						<polyline className="odp-perio-pocket" points={line(s, "pocket")} />
					</g>
				))}
		</svg>
	);
}

const fmt = (v: number | null, unit = "") =>
	v === null ? "—" : `${v.toFixed(1)}${unit}`;

/** Periodontal chart: 4 faces, 6 sites per tooth, margin/pocket graph and indices. */
export function Periodontogram({
	value,
	onChange,
	odontogram,
	className,
}: PeriodontogramProps) {
	const readOnly = !onChange;
	// What is shown: own data plus missing/implant flags from the odontogram.
	const shown = perioWithOdontogram(value, odontogram);
	const missing = (fdi: number) => Boolean(shown[fdi]?.missing);

	/** Applies a validated update; false when the data is out of range. */
	const update = (make: () => PerioChart) => {
		try {
			onChange?.(make());
			return true;
		} catch (e) {
			if (e instanceof RangeError) {
				return false;
			}
			throw e;
		}
	};

	const siteNumbers = (
		arch: Arch,
		face: Face,
		field: "pd" | "gm",
		label: string,
	) => (
		<Row
			label={label}
			teeth={ARCH_TEETH[arch]}
			missing={missing}
			cell={(fdi) =>
				sitesLeftToRight(fdi, face).map((site) => (
					<NumInput
						key={site}
						value={value[fdi]?.sites?.[site]?.[field]}
						label={`${label} ${fdi} ${site}`}
						row={`${arch}-${face}-${field}`}
						disabled={missing(fdi)}
						readOnly={readOnly}
						twoDigits={true}
						negative={field === "gm"}
						onCommit={(v) =>
							update(() => setPerioSite(value, fdi, site, { [field]: v }))
						}
					/>
				))
			}
		/>
	);

	const siteToggles = (
		arch: Arch,
		face: Face,
		field: "bleeding" | "plaque" | "suppuration",
		label: string,
	) => (
		<Row
			label={label}
			teeth={ARCH_TEETH[arch]}
			missing={missing}
			cell={(fdi) =>
				sitesLeftToRight(fdi, face).map((site) => {
					const on = Boolean(value[fdi]?.sites?.[site]?.[field]);
					return (
						<Toggle
							key={site}
							on={on}
							kind={field}
							label={`${label} ${fdi} ${site}`}
							disabled={readOnly || missing(fdi)}
							onToggle={() =>
								update(() => setPerioSite(value, fdi, site, { [field]: !on }))
							}
						/>
					);
				})
			}
		/>
	);

	const toothNumber = (
		arch: Arch,
		field: "mobility" | "keratinized",
		label: string,
	) => (
		<Row
			label={label}
			teeth={ARCH_TEETH[arch]}
			missing={missing}
			cell={(fdi) => (
				<NumInput
					value={value[fdi]?.[field]}
					label={`${label} ${fdi}`}
					row={`${arch}-${field}`}
					disabled={missing(fdi)}
					readOnly={readOnly}
					twoDigits={field === "keratinized"}
					onCommit={(v) =>
						update(() =>
							setPerioTooth(value, fdi, { [field]: v } as PerioTooth),
						)
					}
				/>
			)}
		/>
	);

	const toothFlag = (
		arch: Arch,
		field: "implant" | "missing",
		label: string,
	) => (
		<Row
			label={label}
			teeth={ARCH_TEETH[arch]}
			missing={() => false}
			cell={(fdi) => {
				const own = Boolean(value[fdi]?.[field]);
				const on = Boolean(shown[fdi]?.[field]);
				const fromOdontogram = on && !own;
				return (
					<Toggle
						on={on}
						kind={field}
						label={`${label} ${fdi}${fromOdontogram ? " (del odontograma)" : ""}`}
						disabled={
							readOnly ||
							fromOdontogram ||
							(field === "implant" && missing(fdi))
						}
						onToggle={() =>
							update(() => setPerioTooth(value, fdi, { [field]: !own }))
						}
					/>
				);
			}}
		/>
	);

	const furcation = (arch: Arch, face: Face) => (
		<Row
			label="Furca"
			teeth={ARCH_TEETH[arch]}
			missing={missing}
			cell={(fdi) =>
				faceEntrances(fdi, face).map((entrance) => (
					<NumInput
						key={entrance}
						value={value[fdi]?.furcation?.[entrance]}
						label={`Furca ${fdi} ${entrance}`}
						row={`${arch}-${face}-furcation`}
						disabled={missing(fdi)}
						readOnly={readOnly}
						onCommit={(v) =>
							update(() =>
								setPerioTooth(value, fdi, {
									furcation: { ...value[fdi]?.furcation, [entrance]: v },
								} as PerioTooth),
							)
						}
					/>
				))
			}
		/>
	);

	const numbers = (arch: Arch) => (
		<Row
			label="Diente"
			teeth={ARCH_TEETH[arch]}
			missing={missing}
			cell={(fdi) => <strong className="odp-perio-fdi">{fdi}</strong>}
		/>
	);

	const strip = (arch: Arch, face: Face) => (
		<div className="odp-perio-row">
			<div className="odp-perio-label">
				{face === "V"
					? "Vestibular"
					: arch === "upper"
						? "Palatino"
						: "Lingual"}
			</div>
			<div className="odp-perio-strip-cell">
				<Strip arch={arch} face={face} chart={shown} />
			</div>
		</div>
	);

	const sites = (arch: Arch, face: Face, order: "down" | "up") => {
		const rows = [
			furcation(arch, face),
			siteToggles(arch, face, "bleeding", "Sangrado"),
			siteToggles(arch, face, "plaque", "Placa"),
			siteToggles(arch, face, "suppuration", "Supuración"),
			siteNumbers(arch, face, "gm", "MG"),
			siteNumbers(arch, face, "pd", "PS"),
		];
		// PS always sits next to the teeth.
		return order === "down" ? rows : rows.reverse();
	};

	const s = perioSummary(shown);
	return (
		<div
			className={`odp-perio${className ? ` ${className}` : ""}`}
			// biome-ignore lint/a11y/useSemanticElements: a <fieldset> would add form semantics and borders to the whole chart
			role="group"
			aria-label="Periodontograma"
		>
			<section aria-label="Arcada superior">
				{numbers("upper")}
				{toothFlag("upper", "missing", "Ausente")}
				{toothFlag("upper", "implant", "Implante")}
				{toothNumber("upper", "mobility", "Movilidad")}
				{toothNumber("upper", "keratinized", "Encía quer.")}
				{sites("upper", "V", "down")}
				{strip("upper", "V")}
				{strip("upper", "L")}
				{sites("upper", "L", "up")}
			</section>
			<section aria-label="Arcada inferior">
				{sites("lower", "L", "down")}
				{strip("lower", "L")}
				{strip("lower", "V")}
				{sites("lower", "V", "up")}
				{toothNumber("lower", "keratinized", "Encía quer.")}
				{toothNumber("lower", "mobility", "Movilidad")}
				{toothFlag("lower", "implant", "Implante")}
				{toothFlag("lower", "missing", "Ausente")}
				{numbers("lower")}
			</section>
			<dl className="odp-perio-summary" aria-label="Resumen periodontal">
				<div>
					<dt>Sangrado al sondaje</dt>
					<dd>{fmt(s.bleedingPct, "%")}</dd>
				</div>
				<div>
					<dt>Placa</dt>
					<dd>{fmt(s.plaquePct, "%")}</dd>
				</div>
				<div>
					<dt>PS media</dt>
					<dd>{fmt(s.meanPd, " mm")}</dd>
				</div>
				<div>
					<dt>NIC media</dt>
					<dd>{fmt(s.meanCal, " mm")}</dd>
				</div>
				<div>
					<dt>Sitios PS ≥ 4</dt>
					<dd>{s.sitesPd4}</dd>
				</div>
				<div>
					<dt>Sitios PS ≥ 6</dt>
					<dd>{s.sitesPd6}</dd>
				</div>
				<div>
					<dt>Supuración</dt>
					<dd>{s.suppurationSites}</dd>
				</div>
				<div>
					<dt>Sitios examinados</dt>
					<dd>{s.sites}</dd>
				</div>
			</dl>
		</div>
	);
}
