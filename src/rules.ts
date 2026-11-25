/**
 * The pure part of the library: catalogue, clinical rules, periodontal model
 * and patient chart. No React and no CSS, so a server (Node) can import it.
 */
export {
	ALL_FDI,
	type Arch,
	type Dentition,
	type ToothInfo,
	type ToothType,
	isValidFdi,
	toothInfo,
} from "./anatomy/fdi";
export { SURFACES, type Surface } from "./anatomy/geometry";
export type { MarkZone, ToothMark } from "./components/ToothSvg";
export {
	FINDINGS,
	type FindingCode,
	type FindingDef,
	type FindingKind,
	type FindingState,
	SIGLA_NAMES,
	SURFACE_CONFLICTS,
	TOOTH_CONFLICTS,
} from "./findings/catalog";
export {
	type Finding,
	type OdontogramValue,
	addFinding,
	conflictOf,
	describeFindings,
	findingDef,
	findingSigla,
	findingState,
	removeFinding,
	validateFinding,
} from "./findings/model";
export {
	type FurcationEntrance,
	type Grade,
	type PerioChart,
	type PerioSite,
	type PerioSummary,
	type PerioTooth,
	type Prognosis,
	SITES,
	type Site,
	cal,
	furcationEntrances,
	perioSummary,
	setPerioSite,
	setPerioTooth,
	validatePerioTooth,
} from "./perio/model";
export {
	PATIENT_CHART_VERSION,
	type PatientChart,
	emptyPatientChart,
	parsePatientChart,
	perioWithOdontogram,
} from "./integration/patient";
