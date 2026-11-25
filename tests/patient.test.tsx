import { fireEvent, render } from "@testing-library/react";
import {
	GEOMETRY_VERSION,
	type PatientChart,
	Periodontogram,
	emptyPatientChart,
	parsePatientChart,
	perioWithOdontogram,
} from "../src";

const chart: PatientChart = {
	version: 1,
	odontogram: {
		18: [{ code: "missing" }],
		36: [{ code: "implant" }],
		16: [{ code: "caries", surfaces: ["O"] }],
		55: [{ code: "missing" }],
	},
	periodontogram: {
		16: { sites: { MV: { pd: 4, gm: 1, bleeding: true } } },
		18: { sites: { V: { pd: 9 } } },
	},
	marks: [
		{
			fdi: 16,
			view: "occlusal",
			x: 1,
			y: -2,
			zone: "M",
			geometryVersion: GEOMETRY_VERSION,
		},
	],
};

describe("perioWithOdontogram", () => {
	const shown = perioWithOdontogram(chart.periodontogram, chart.odontogram);

	it("takes missing teeth and implants from the odontogram", () => {
		expect(shown[18]?.missing).toBe(true);
		expect(shown[36]?.implant).toBe(true);
	});

	it("keeps the perio data and ignores other findings and primary teeth", () => {
		expect(shown[18]?.sites).toEqual({ V: { pd: 9 } });
		expect(shown[16]).toEqual(chart.periodontogram[16]);
		expect(shown[55]).toBeUndefined();
	});

	it("does not write into the stored chart", () => {
		expect(chart.periodontogram[18]?.missing).toBeUndefined();
	});
});

describe("parsePatientChart", () => {
	it("round-trips through JSON", () => {
		expect(parsePatientChart(JSON.stringify(chart))).toEqual(chart);
		expect(parsePatientChart(emptyPatientChart())).toEqual(emptyPatientChart());
	});

	it("fills missing sections with empty ones", () => {
		expect(parsePatientChart({ version: 1 })).toEqual(emptyPatientChart());
	});

	it.each([
		["broken JSON", "{oops", "no es un JSON válido"],
		["a non-object", "[]", "se esperaba un objeto"],
		["another version", { version: 2 }, "versión no soportada: 2"],
		[
			"a bad finding",
			{ version: 1, odontogram: { 16: [{ code: "caries" }] } },
			"odontogram 16[0]",
		],
		[
			"an invalid tooth",
			{ version: 1, odontogram: { 19: [{ code: "missing" }] } },
			"Código FDI no válido",
		],
		[
			"out-of-range perio",
			{ version: 1, periodontogram: { 16: { sites: { V: { pd: 40 } } } } },
			"periodontogram 16",
		],
		[
			"perio on a primary tooth",
			{ version: 1, periodontogram: { 54: {} } },
			"piezas permanentes",
		],
		[
			"a malformed mark",
			{ version: 1, marks: [{ fdi: 16, view: "side" }] },
			"marks[0]",
		],
	])("rejects %s with a clear message", (_, input, message) => {
		expect(() => parsePatientChart(input)).toThrow(RangeError);
		expect(() => parsePatientChart(input)).toThrow(message);
	});
});

describe("Periodontogram with the odontogram", () => {
	it("shows and locks the teeth the odontogram marks", () => {
		const onChange = vi.fn();
		const { getByLabelText } = render(
			<Periodontogram
				value={chart.periodontogram}
				odontogram={chart.odontogram}
				onChange={onChange}
			/>,
		);
		const absent = getByLabelText("Ausente 18 (del odontograma)");
		expect(absent).toHaveAttribute("aria-pressed", "true");
		expect(absent).toBeDisabled();
		expect(getByLabelText("PS 18 V")).toBeDisabled();
		expect(getByLabelText("Implante 36 (del odontograma)")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		// Other teeth stay editable from the periodontogram itself.
		fireEvent.click(getByLabelText("Ausente 17"));
		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ 17: { missing: true } }),
		);
	});

	it("leaves odontogram-missing teeth out of the summary", () => {
		const { getByText } = render(
			<Periodontogram
				value={chart.periodontogram}
				odontogram={chart.odontogram}
			/>,
		);
		// Only 16 MV is examined: 18 (PS 9) is missing per the odontogram.
		expect(getByText("4.0 mm")).toBeInTheDocument();
		expect(getByText("100.0%")).toBeInTheDocument();
	});
});
