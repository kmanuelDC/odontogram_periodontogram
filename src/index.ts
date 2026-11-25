import "./styles.css";

export {
	ALL_FDI,
	type Arch,
	type Dentition,
	type ToothInfo,
	type ToothType,
	isValidFdi,
	toothInfo,
} from "./anatomy/fdi";
export {
	GEOMETRY_VERSION,
	type LateralView,
	type OcclusalView,
	type Pt,
	SURFACES,
	type Surface,
	type ToothGeometry,
	type ViewBox,
	getToothGeometry,
} from "./anatomy/geometry";
export {
	ToothSvg,
	type MarkZone,
	type ToothMark,
	type ToothSvgProps,
	type ToothView,
} from "./components/ToothSvg";
export {
	type ChartDentition,
	type OdontogramLayout,
	type Rect,
	type ToothSlot,
	layoutOdontogram,
} from "./layout/odontogramLayout";
export {
	Odontogram,
	type OdontogramProps,
	type OdontogramSelection,
} from "./components/Odontogram";
export {
	FindingPicker,
	type FindingPickerProps,
	type PickerCloseReason,
} from "./components/FindingPicker";
export { FindingIcon } from "./components/FindingIcon";
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
	Periodontogram,
	type PeriodontogramProps,
} from "./components/Periodontogram";
export {
	PATIENT_CHART_VERSION,
	type PatientChart,
	emptyPatientChart,
	parsePatientChart,
	perioWithOdontogram,
} from "./integration/patient";
