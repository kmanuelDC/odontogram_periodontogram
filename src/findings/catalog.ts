/**
 * NTS colour rule: blue = good state / done, red = bad state / to treat.
 * Anomalies (extruded, diastema, DES…) are always blue in the NTS.
 */
export type FindingState = "good" | "bad";

/** How a finding is drawn. */
export type FindingKind =
	| "surface" // fills the chosen occlusal surfaces
	| "surfaceOutline" // outlines the chosen occlusal surfaces
	| "crown" // outlines the crown (lateral) and the occlusal circle
	| "cross" // X over the whole tooth
	| "rootCanal" // line along each root
	| "postCore" // square in the crown joined to a line along the root
	| "implant"
	| "extrusion"
	| "intrusion"
	| "rotation"
	| "migration"
	| "eruption"
	| "fracture"
	| "bridge" // spans to another tooth (`to`)
	| "orthodontic" // spans to another tooth (`to`)
	| "diastema" // between this tooth and an adjacent one (`to`)
	| "orthodonticRemovable" // zigzag at apex level, spans to `to`
	| "removableProsthesis" // two lines at apex level, spans to `to`
	| "totalProsthesis" // two lines over the crowns, spans to `to`
	| "edentulous" // one line over the crowns, spans to `to`
	| "numberRing" // one ring around the tooth number
	| "fusion" // two crossing rings around both numbers (`to`)
	| "transposition" // two crossing curved arrows at the numbers (`to`)
	| "supernumerary" // circled S between the apices of this tooth and `to`
	| "peg" // triangle around the tooth number
	| "rootSigla" // the sigla written on the root, not in the box
	| "sigla"; // only the text in the box

export interface FindingDef {
	name: string;
	kind: FindingKind;
	/** Allowed siglas; the first is the default. */
	siglas?: readonly string[];
	/** Fixed colour: the finding is always good or always bad. */
	state?: FindingState;
	/** Meanings that differ from SIGLA_NAMES for this finding (e.g. "D"). */
	siglaNames?: Readonly<Record<string, string>>;
}

/**
 * Findings catalogue based on the Peruvian odontogram technical standard
 * (NTS, MINSA). shortcut: siglas and colours must be checked against the
 * current NTS by a clinician before clinical use; edit this table, not the renderer.
 */
export const FINDINGS = {
	caries: {
		name: "Caries",
		kind: "surface",
		siglas: ["MB", "CE", "CD", "CDP"],
		state: "bad",
	},
	restoration: {
		name: "Restauración definitiva",
		kind: "surface",
		siglas: ["AM", "R", "IV", "IM", "IE", "C"],
	},
	temporaryRestoration: {
		name: "Restauración temporal",
		kind: "surfaceOutline",
		state: "bad",
	},
	sealant: { name: "Sellante", kind: "surfaceOutline", siglas: ["S"] },
	crown: {
		name: "Corona definitiva",
		kind: "crown",
		// NTS 188-MINSA/DGIESP-2022 crown types.
		siglas: ["CM", "CF", "CMC", "CV", "CLM"],
	},
	temporaryCrown: {
		name: "Corona temporal",
		kind: "crown",
		siglas: ["CT"],
		state: "bad",
	},
	pulpTreatment: {
		name: "Tratamiento pulpar",
		kind: "rootCanal",
		siglas: ["TC", "PC", "PP"],
	},
	postCore: { name: "Espigo-muñón", kind: "postCore" },
	implant: { name: "Implante dental", kind: "implant", siglas: ["IMP"] },
	missing: { name: "Diente ausente", kind: "cross", state: "good" },
	extraction: { name: "Extracción indicada", kind: "cross", state: "bad" },
	rootRemnant: {
		name: "Remanente radicular",
		kind: "rootSigla",
		siglas: ["RR"],
		state: "bad",
	},
	extruded: { name: "Diente extruido", kind: "extrusion", state: "good" },
	intruded: { name: "Diente intruido", kind: "intrusion", state: "good" },
	rotated: { name: "Giroversión", kind: "rotation", state: "good" },
	migrated: { name: "Migración", kind: "migration", state: "good" },
	erupting: { name: "Diente en erupción", kind: "eruption", state: "bad" },
	fracture: { name: "Fractura", kind: "fracture", state: "bad" },
	fixedProsthesis: { name: "Prótesis fija", kind: "bridge" },
	orthodonticFixed: { name: "Aparato ortodóntico fijo", kind: "orthodontic" },
	orthodonticRemovable: {
		name: "Aparato ortodóntico removible",
		kind: "orthodonticRemovable",
	},
	removableProsthesis: {
		name: "Prótesis removible",
		kind: "removableProsthesis",
	},
	totalProsthesis: { name: "Prótesis total", kind: "totalProsthesis" },
	edentulous: { name: "Edéntulo total", kind: "edentulous", state: "good" },
	gemination: { name: "Geminación", kind: "numberRing", state: "good" },
	fusion: { name: "Fusión", kind: "fusion", state: "good" },
	transposition: {
		name: "Transposición",
		kind: "transposition",
		state: "good",
	},
	supernumerary: {
		name: "Supernumerario",
		kind: "supernumerary",
		state: "good",
	},
	peg: { name: "Diente en clavija", kind: "peg", state: "good" },
	diastema: { name: "Diastema", kind: "diastema", state: "good" },
	worn: {
		name: "Superficie desgastada",
		kind: "sigla",
		siglas: ["DES"],
		state: "good",
	},
	discolored: {
		name: "Diente discrómico",
		kind: "sigla",
		siglas: ["DIS"],
		state: "good",
	},
	ectopic: {
		name: "Diente ectópico",
		kind: "sigla",
		siglas: ["E"],
		state: "good",
	},
	impacted: {
		name: "Impactación",
		kind: "sigla",
		siglas: ["I"],
		state: "good",
	},
	semiImpacted: {
		name: "Semi-impactación",
		kind: "sigla",
		siglas: ["SI"],
		state: "good",
	},
	macrodontia: {
		name: "Macrodoncia",
		kind: "sigla",
		siglas: ["MAC"],
		state: "good",
	},
	microdontia: {
		name: "Microdoncia",
		kind: "sigla",
		siglas: ["MIC"],
		state: "good",
	},
	mobility: {
		name: "Movilidad patológica",
		kind: "sigla",
		siglas: ["M1", "M2", "M3"],
		state: "good",
	},
	// NTS 188 / SIHCE: painted red on the affected surface, type in the box.
	enamelDefect: {
		name: "Defecto de desarrollo del esmalte",
		kind: "surface",
		siglas: ["HP", "HM", "O", "D", "FLU"],
		state: "bad",
		siglaNames: Object.fromEntries([["D", "Decoloración del esmalte"]]),
	},
	abnormalPosition: {
		name: "Posición anormal dentaria",
		kind: "sigla",
		siglas: ["M", "D", "V", "P", "L"],
		state: "good",
	},
	deepFissures: {
		name: "Fosas y fisuras profundas",
		kind: "sigla",
		siglas: ["FFP"],
		state: "good",
	},
} as const satisfies Record<string, FindingDef>;

export type FindingCode = keyof typeof FINDINGS;

/** Kinds that need surfaces / a second tooth. */
export const SURFACE_KINDS: readonly FindingKind[] = [
	"surface",
	"surfaceOutline",
];
export const SPAN_KINDS: readonly FindingKind[] = [
	"bridge",
	"orthodontic",
	"diastema",
	"orthodonticRemovable",
	"removableProsthesis",
	"totalProsthesis",
	"edentulous",
	"fusion",
	"transposition",
	"supernumerary",
];

/** What each sigla stands for (shown next to it in the picker). */
export const SIGLA_NAMES: Readonly<Record<string, string>> = Object.fromEntries(
	[
		["MB", "Mancha blanca"],
		["CE", "Caries de esmalte"],
		["CD", "Caries de dentina"],
		["CDP", "Caries de dentina con compromiso pulpar"],
		["AM", "Amalgama"],
		["R", "Resina"],
		["IV", "Ionómero de vidrio"],
		["IM", "Incrustación metálica"],
		["IE", "Incrustación estética"],
		["C", "Carilla"],
		["S", "Sellante"],
		["CM", "Corona metálica"],
		["CF", "Corona fenestrada"],
		["CMC", "Corona metal cerámica"],
		["CV", "Corona veneer"],
		["CLM", "Corona libre de metal"],
		["CT", "Corona temporal"],
		["TC", "Tratamiento de conductos"],
		["PC", "Pulpectomía"],
		["PP", "Pulpotomía"],
		["IMP", "Implante"],
		["RR", "Remanente radicular"],
		["DES", "Desgaste oclusal / incisal"],
		["DIS", "Discromía"],
		["E", "Ectópico"],
		["I", "Impactación"],
		["SI", "Semi-impactación"],
		["MAC", "Macrodoncia"],
		["MIC", "Microdoncia"],
		["M1", "Movilidad grado 1"],
		["M2", "Movilidad grado 2"],
		["M3", "Movilidad grado 3"],
		["O", "Opacidades del esmalte"],
		["HP", "Hipoplasia del esmalte"],
		["HM", "Hipomineralización"],
		["FLU", "Fluorosis"],
		["M", "Mesializado"],
		["D", "Distalizado"],
		["V", "Vestibularizado"],
		["P", "Palatinizado"],
		["L", "Lingualizado"],
		["FFP", "Fosas y fisuras profundas"],
	],
);

/** Spans drawn over missing teeth: their ends may be absent teeth. */
export const GAP_SPAN_KINDS: readonly FindingKind[] = [
	"removableProsthesis",
	"totalProsthesis",
	"edentulous",
	"orthodonticRemovable",
];

/** Spans that may not cross or share a tooth with another of the same finding. */
export const NO_OVERLAP_KINDS: readonly FindingKind[] = [
	"bridge",
	"orthodontic",
	...GAP_SPAN_KINDS,
];

/** Findings only a natural tooth can have (not an implant). */
const NATURAL_ONLY: readonly FindingCode[] = [
	"caries",
	"restoration",
	"temporaryRestoration",
	"sealant",
	"pulpTreatment",
	"postCore",
	"rootRemnant",
	"extraction",
	"erupting",
	"impacted",
	"semiImpacted",
	"peg",
	"discolored",
	"macrodontia",
	"microdontia",
	"worn",
	"ectopic",
	"enamelDefect",
	"deepFissures",
];

/**
 * Findings that cannot share one tooth, checked both ways. "Diente ausente"
 * excludes every other tooth finding and is not listed. Clinical rules: edit
 * this table, not the checks.
 */
export const TOOTH_CONFLICTS: readonly (readonly [
	FindingCode,
	readonly FindingCode[],
])[] = [
	["crown", ["temporaryCrown", "sealant", "rootRemnant", "impacted"]],
	["temporaryCrown", ["sealant", "rootRemnant", "impacted"]],
	["implant", NATURAL_ONLY],
	[
		"rootRemnant",
		[
			"caries",
			"restoration",
			"temporaryRestoration",
			"sealant",
			"worn",
			"erupting",
			"impacted",
			"semiImpacted",
			"peg",
		],
	],
	["erupting", ["impacted", "semiImpacted", "extruded", "intruded"]],
	[
		"impacted",
		[
			"semiImpacted",
			"caries",
			"restoration",
			"temporaryRestoration",
			"sealant",
			"worn",
			"extruded",
			"intruded",
			"mobility",
		],
	],
	["semiImpacted", ["extruded", "intruded"]],
	["extruded", ["intruded"]],
	["macrodontia", ["microdontia"]],
];

/** Surface findings that cannot share a surface, checked both ways. */
export const SURFACE_CONFLICTS: readonly (readonly [
	FindingCode,
	readonly FindingCode[],
])[] = [
	["restoration", ["temporaryRestoration", "sealant"]],
	["temporaryRestoration", ["sealant"]],
];
