import {
	type CSSProperties,
	Fragment,
	type KeyboardEvent,
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { ALL_FDI, chartX, toothInfo } from "../anatomy/fdi";
import { SURFACES, type Surface } from "../anatomy/geometry";
import {
	FINDINGS,
	type FindingCode,
	type FindingDef,
	type FindingState,
	SIGLA_NAMES,
	SPAN_KINDS,
	SURFACE_KINDS,
} from "../findings/catalog";
import {
	type Finding,
	type OdontogramValue,
	conflictOf,
	describeFindings,
} from "../findings/model";
import { FindingIcon } from "./FindingIcon";
import { type MarkZone, ZONE_NAMES } from "./ToothSvg";

/** Why the picker closed: the host restores focus except after an outside click. */
export type PickerCloseReason = "escape" | "button" | "outside";

export interface FindingPickerProps {
	fdi: number;
	zone: MarkZone;
	/** Findings already on this tooth (listed with a remove button). */
	findings: readonly Finding[];
	/**
	 * The whole chart, to hide findings and end teeth the clinical rules
	 * reject (see conflictOf). Default: only this tooth's findings.
	 */
	chart?: OdontogramValue;
	/** Findings the form may offer, in catalogue order. Default: all. */
	codes?: readonly FindingCode[];
	/** Called with a finding built from the form; may throw RangeError (shown inline). */
	onAdd: (finding: Finding) => void;
	onRemove: (index: number) => void;
	onClose: (reason: PickerCloseReason) => void;
	className?: string;
	style?: CSSProperties;
}

const CODES = Object.keys(FINDINGS) as FindingCode[];
const GROUPS: readonly [string, (c: FindingCode) => boolean][] = [
	["Caras", (c) => SURFACE_KINDS.includes(FINDINGS[c].kind)],
	[
		"Diente",
		(c) =>
			!(
				SURFACE_KINDS.includes(FINDINGS[c].kind) ||
				SPAN_KINDS.includes(FINDINGS[c].kind) ||
				FINDINGS[c].kind === "sigla"
			),
	],
	["Entre dientes", (c) => SPAN_KINDS.includes(FINDINGS[c].kind)],
	["Siglas", (c) => FINDINGS[c].kind === "sigla"],
];

/** The finding as it would be saved (also drives the icons). */
function buildFinding(
	code: FindingCode,
	sigla: string,
	form: {
		state: FindingState;
		surface: Surface | undefined;
		to: string;
		direction: "mesial" | "distal";
		location: "crown" | "root";
	},
): Finding {
	const d = FINDINGS[code];
	return {
		code,
		...(sigla ? { sigla } : {}),
		...("state" in d ? {} : { state: form.state }),
		...(SURFACE_KINDS.includes(d.kind)
			? { surfaces: [form.surface ?? "O"] }
			: {}),
		...(SPAN_KINDS.includes(d.kind) ? { to: Number(form.to) } : {}),
		...(code === "migrated" ? { direction: form.direction } : {}),
		...(d.kind === "fracture" ? { location: form.location } : {}),
	};
}

/** Small form to add an NTS finding on a tooth zone. */
export function FindingPicker({
	fdi,
	zone,
	findings,
	chart = { [fdi]: findings },
	codes: allowed = CODES,
	onAdd,
	onRemove,
	onClose,
	className,
	style,
}: FindingPickerProps) {
	const surface = (SURFACES as readonly string[]).includes(zone)
		? (zone as Surface)
		: undefined;
	const codes = offeredCodes(chart, fdi, surface, allowed);

	const ref = useRef<HTMLDialogElement>(null);
	const closeRef = useRef(onClose);
	closeRef.current = onClose;
	useEffect(() => {
		const outside = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) {
				closeRef.current("outside");
			}
		};
		document.addEventListener("pointerdown", outside);
		return () => document.removeEventListener("pointerdown", outside);
	}, []);

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			e.stopPropagation();
			onClose("escape");
		}
	};

	return (
		<dialog
			ref={ref}
			open={true}
			aria-label={`Hallazgos: diente ${fdi}, ${ZONE_NAMES[zone]}`}
			className={`odp-picker${className ? ` ${className}` : ""}`}
			style={style}
			onKeyDown={onKeyDown}
		>
			<header className="odp-picker-head">
				<span className="odp-picker-tooth">{fdi}</span>
				<span className="odp-picker-title">
					<strong>Pieza {fdi}</strong>
					<small>{ZONE_NAMES[zone]}</small>
				</span>
				<button
					type="button"
					className="odp-icon-btn"
					aria-label="Cerrar"
					onClick={() => onClose("button")}
				>
					×
				</button>
			</header>
			{codes.length > 0 ? (
				<PickerForm
					id={`odp-picker-${fdi}-${zone}`}
					fdi={fdi}
					surface={surface}
					chart={chart}
					codes={codes}
					onAdd={onAdd}
				/>
			) : (
				<p className="odp-picker-body">
					No hay hallazgos compatibles con esta pieza.
				</p>
			)}
			{findings.length > 0 ? (
				<section className="odp-picker-saved" aria-label="Registrados">
					<h3>Registrados</h3>
					<ul>
						{findings.map((f, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: findings may repeat
							<li key={i}>
								<FindingIcon fdi={fdi} finding={f} size={20} />
								<span>{describeFindings([f])}</span>
								<button
									type="button"
									className="odp-btn odp-btn-danger"
									aria-label={`Quitar ${describeFindings([f])}`}
									onClick={() => onRemove(i)}
								>
									Quitar
								</button>
							</li>
						))}
					</ul>
				</section>
			) : null}
		</dialog>
	);
}

/** The add form: finding, sigla, state, end tooth and direction. */
function PickerForm({
	id,
	fdi,
	surface,
	chart,
	codes,
	onAdd,
}: {
	id: string;
	fdi: number;
	surface: Surface | undefined;
	chart: OdontogramValue;
	codes: readonly FindingCode[];
	onAdd: (finding: Finding) => void;
}) {
	const [chosen, setCode] = useState<FindingCode>(codes[0]);
	// After an add the chosen finding may no longer fit: fall back to the first.
	const code = codes.includes(chosen) ? chosen : codes[0];
	const [sigla, setSigla] = useState("");
	const [state, setState] = useState<FindingState>("bad");
	const [to, setTo] = useState("");
	const [direction, setDirection] = useState<"mesial" | "distal">("mesial");
	const [location, setLocation] = useState<"crown" | "root">("crown");
	const [error, setError] = useState("");
	const def = FINDINGS[code];
	const span = SPAN_KINDS.includes(def.kind);
	const teeth = span ? reachableTeeth(chart, fdi, code) : [];
	const end = teeth.includes(Number(to)) ? to : "";
	// Errors sit under the field they belong to ("Hasta la pieza"), else under the form.
	const errorText = (
		<p id={`${id}-error`} role="alert" className="odp-picker-error">
			{error}
		</p>
	);

	const build = (c: FindingCode) =>
		buildFinding(c, c === chosen ? sigla : "", {
			state,
			surface,
			to: end,
			direction,
			location,
		});
	const add = () => {
		try {
			onAdd(build(code));
			setError("");
		} catch (e) {
			setError((e as Error).message);
		}
	};

	return (
		<div className="odp-picker-body">
			<FindingSelect
				id={id}
				fdi={fdi}
				codes={codes}
				value={code}
				build={build}
				onChange={(c) => {
					setCode(c);
					setSigla("");
					setTo("");
					setError("");
				}}
			/>
			{"siglas" in def && def.siglas.length > 1 ? (
				<Segmented
					legend="Sigla"
					name={`${id}-sigla`}
					value={sigla || def.siglas[0]}
					options={def.siglas.map((s) => [
						s,
						<Fragment key={s}>
							<b>{s}</b>
							<small>{siglaName(def, s)}</small>
						</Fragment>,
					])}
					grid={true}
					onChange={(s) => setSigla(s === def.siglas[0] ? "" : s)}
				/>
			) : null}
			{"state" in def ? null : (
				<Segmented
					legend="Estado"
					name={`${id}-state`}
					value={state}
					options={[
						["bad", "Malo"],
						["good", "Bueno"],
					]}
					onChange={(s) => setState(s as FindingState)}
					dots={true}
				/>
			)}
			{span ? (
				<ToothField
					id={`${id}-to`}
					teeth={teeth}
					value={end}
					onChange={setTo}
					error={error ? errorText : null}
				/>
			) : null}
			{code === "migrated" ? (
				<Segmented
					legend="Dirección"
					name={`${id}-dir`}
					value={direction}
					options={[
						["mesial", "Mesial"],
						["distal", "Distal"],
					]}
					onChange={(d) => setDirection(d as "mesial" | "distal")}
				/>
			) : null}
			{def.kind === "fracture" ? (
				<Segmented
					legend="Ubicación"
					name={`${id}-loc`}
					value={location}
					options={[
						["crown", "Corona"],
						["root", "Raíz"],
					]}
					onChange={(l) => setLocation(l as "crown" | "root")}
				/>
			) : null}
			<button
				type="button"
				className="odp-btn odp-btn-primary odp-picker-add"
				onClick={add}
			>
				Registrar hallazgo
			</button>
			{error && !span ? errorText : null}
		</div>
	);
}

/** Teeth of the same arch and dentition, left to right as on the chart. */
function archTeeth(fdi: number) {
	const { arch, dentition } = toothInfo(fdi);
	return ALL_FDI.filter((f) => {
		const t = toothInfo(f);
		return t.arch === arch && t.dentition === dentition;
	}).sort((a, b) => chartX(a) - chartX(b));
}

/**
 * Findings the form offers on this zone: surface ones only on a face, spans
 * while some tooth can end them, all only if the clinical rules accept them.
 */
function offeredCodes(
	chart: OdontogramValue,
	fdi: number,
	surface: Surface | undefined,
	allowed: readonly FindingCode[],
) {
	return CODES.filter((c) => {
		if (!allowed.includes(c)) {
			return false;
		}
		const kind = FINDINGS[c].kind;
		if (SURFACE_KINDS.includes(kind)) {
			return surface !== undefined && fits(chart, fdi, c, surface);
		}
		return SPAN_KINDS.includes(kind)
			? reachableTeeth(chart, fdi, c).length > 0
			: fits(chart, fdi, c, surface);
	});
}

/** What a sigla means for this finding: its own override, else SIGLA_NAMES. */
const siglaName = (def: FindingDef, s: string) =>
	def.siglaNames?.[s] ?? SIGLA_NAMES[s];

/** True when the finding, with defaults, passes the chart's clinical rules. */
function fits(
	chart: OdontogramValue,
	fdi: number,
	code: FindingCode,
	surface: Surface | undefined,
) {
	const f: Finding =
		surface && SURFACE_KINDS.includes(FINDINGS[code].kind)
			? { code, surfaces: [surface] }
			: { code };
	return conflictOf(chart, fdi, f) === undefined;
}

/**
 * Where a span can end: the neighbours for diastema/supernumerary, else the
 * arch; only teeth the clinical rules accept (absent ends, crossing spans…).
 */
function reachableTeeth(
	chart: OdontogramValue,
	fdi: number,
	code: FindingCode,
) {
	const row = archTeeth(fdi);
	const i = row.indexOf(fdi);
	const kind = FINDINGS[code].kind;
	const ends =
		kind === "diastema" || kind === "supernumerary"
			? [row[i - 1], row[i + 1]].filter((f) => f !== undefined)
			: row.filter((f) => f !== fdi);
	return ends.filter(
		(to) => conflictOf(chart, fdi, { code, to }) === undefined,
	);
}

/** "Up to tooth" field of spans; the error sits under it. */
function ToothField({
	id,
	teeth,
	value,
	onChange,
	error,
}: {
	id: string;
	teeth: readonly number[];
	value: string;
	onChange: (value: string) => void;
	error: ReactElement | null;
}) {
	return (
		<div className="odp-picker-field">
			<label htmlFor={id}>Hasta la pieza</label>
			<select
				id={id}
				className="odp-input"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-invalid={error ? true : undefined}
				aria-describedby={error ? error.props.id : undefined}
			>
				<option value="">Elegir pieza</option>
				{teeth.map((f) => (
					<option key={f} value={f}>
						{f}
					</option>
				))}
			</select>
			{error}
		</div>
	);
}

/** Radio buttons drawn as a segmented control. */
function Segmented({
	legend,
	name,
	value,
	options,
	onChange,
	dots = false,
	grid = false,
}: {
	legend: string;
	name: string;
	value: string;
	options: readonly (readonly [string, ReactNode])[];
	onChange: (value: string) => void;
	dots?: boolean;
	/** Two columns of code + meaning, for long lists like the crown siglas. */
	grid?: boolean;
}) {
	return (
		<fieldset
			className={`odp-picker-field odp-seg${grid ? " odp-seg-grid" : ""}`}
		>
			<legend>{legend}</legend>
			<div>
				{options.map(([v, label]) => (
					<label key={v} className={dots ? `odp-seg-${v}` : undefined}>
						<input
							type="radio"
							name={name}
							value={v}
							checked={value === v}
							onChange={() => onChange(v)}
						/>
						<span>{label}</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}

/** Lower case without accents: "Prótesis" matches "protesis". */
const ACCENTS = /\p{M}/gu;
const fold = (t: string) =>
	t.normalize("NFD").replace(ACCENTS, "").toLowerCase();

/** Name contains the text, or a sigla starts with it (RR, MAC, CMC…). */
function matches(c: FindingCode, text: string) {
	const q = fold(text.trim());
	const def: FindingDef = FINDINGS[c];
	return (
		!q ||
		fold(def.name).includes(q) ||
		(def.siglas ?? []).some((s) => fold(s).startsWith(q))
	);
}

/** Dropdown with the NTS symbol of each finding (a native <select> cannot show images). */
function FindingSelect({
	id,
	fdi,
	codes,
	value,
	build,
	onChange,
}: {
	id: string;
	fdi: number;
	codes: readonly FindingCode[];
	value: FindingCode;
	build: (c: FindingCode) => Finding;
	onChange: (c: FindingCode) => void;
}) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(value);
	const [query, setQuery] = useState("");
	const button = useRef<HTMLButtonElement>(null);
	const search = useRef<HTMLInputElement>(null);
	const groupsFor = (text: string) =>
		GROUPS.map(
			([label, has]) =>
				[label, codes.filter((c) => has(c) && matches(c, text))] as const,
		).filter(([, cs]) => cs.length > 0);
	const groups = groupsFor(query);
	const order = groups.flatMap(([, cs]) => cs);
	const optionId = (c: string) => `${id}-opt-${c}`;

	useEffect(() => {
		if (open) {
			search.current?.focus();
		}
	}, [open]);
	useEffect(() => {
		if (open) {
			document.getElementById(optionId(active))?.scrollIntoView?.({
				block: "nearest",
			});
		}
	});

	/** Typing highlights the first match, so Enter picks it. */
	const filter = (text: string) => {
		setQuery(text);
		setActive(groupsFor(text)[0]?.[1][0] ?? value);
	};
	const show = (text = "") => {
		filter(text);
		if (!text) {
			setActive(value);
		}
		setOpen(true);
	};
	const choose = (c: FindingCode) => {
		onChange(c);
		setOpen(false);
		button.current?.focus();
	};
	const onListKey = (e: KeyboardEvent) => {
		const i = order.indexOf(active);
		const typing = e.target === search.current;
		const next = new Map([
			["ArrowDown", Math.min(i + 1, order.length - 1)],
			["ArrowUp", Math.max(i - 1, 0)],
			...(typing
				? []
				: [
						["Home", 0],
						["End", order.length - 1],
					]),
		] as [string, number][]).get(e.key);
		if (next !== undefined) {
			e.preventDefault();
			setActive(order[next]);
		} else if (e.key === "Enter" || (e.key === " " && !typing)) {
			e.preventDefault();
			if (order.includes(active)) {
				choose(active);
			}
		} else if (e.key === "Escape") {
			e.stopPropagation();
			setOpen(false);
			button.current?.focus();
		} else if (e.key === "Tab") {
			setOpen(false);
		}
	};

	return (
		<div className="odp-picker-field odp-fselect">
			<span id={`${id}-label`}>Hallazgo</span>
			<button
				ref={button}
				id={`${id}-button`}
				type="button"
				className="odp-fselect-button"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-labelledby={`${id}-label ${id}-button`}
				onClick={() => (open ? setOpen(false) : show())}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						show();
					} else if (
						e.key.length === 1 &&
						e.key !== " " &&
						!(e.ctrlKey || e.metaKey || e.altKey)
					) {
						e.preventDefault(); // type-to-search: the key starts the query
						show(e.key);
					}
				}}
			>
				<FindingIcon fdi={fdi} finding={build(value)} size={22} />
				<span>{FINDINGS[value].name}</span>
			</button>
			{open ? (
				<div
					className="odp-fselect-pop"
					onKeyDown={onListKey}
					onBlur={(e) => {
						if (!e.currentTarget.parentElement?.contains(e.relatedTarget)) {
							setOpen(false);
						}
					}}
				>
					<input
						ref={search}
						type="search"
						className="odp-input odp-fselect-search"
						placeholder="Buscar por nombre o sigla…"
						role="combobox"
						aria-label="Buscar hallazgo"
						aria-expanded={true}
						aria-controls={`${id}-list`}
						aria-autocomplete="list"
						aria-activedescendant={
							order.includes(active) ? optionId(active) : undefined
						}
						autoComplete="off"
						value={query}
						onChange={(e) => filter(e.target.value)}
					/>
					<div
						id={`${id}-list`}
						// biome-ignore lint/a11y/useSemanticElements: options carry symbols, which <select> cannot show
						role="listbox"
						aria-labelledby={`${id}-label`}
						tabIndex={-1}
						className="odp-fselect-list"
					>
						{order.length === 0 ? (
							<div className="odp-fselect-empty">Sin resultados</div>
						) : null}
						{groups.map(([label, cs]) => (
							<div
								key={label}
								// biome-ignore lint/a11y/useSemanticElements: an option group inside a listbox
								role="group"
								aria-labelledby={`${id}-g-${label}`}
							>
								<div id={`${id}-g-${label}`} className="odp-fselect-group">
									{label}
								</div>
								{cs.map((c) => (
									// biome-ignore lint/a11y/useKeyWithClickEvents: the listbox handles the keyboard (aria-activedescendant)
									<div
										key={c}
										id={optionId(c)}
										// biome-ignore lint/a11y/useSemanticElements: see the listbox
										role="option"
										tabIndex={-1}
										aria-selected={c === value}
										data-active={c === active ? true : undefined}
										onClick={() => choose(c)}
										onMouseEnter={() => setActive(c)}
									>
										<FindingIcon fdi={fdi} finding={build(c)} size={22} />
										<span>{FINDINGS[c].name}</span>
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			) : null}
		</div>
	);
}
