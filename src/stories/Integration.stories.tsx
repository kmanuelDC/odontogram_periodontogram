import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import { Odontogram, type OdontogramSelection } from "../components/Odontogram";
import { Periodontogram } from "../components/Periodontogram";
import type { FindingCode } from "../findings/catalog";
import { addFinding } from "../findings/model";
import {
	type PatientChart,
	emptyPatientChart,
	parsePatientChart,
} from "../integration/patient";

const SAMPLE: PatientChart = {
	...emptyPatientChart(),
	odontogram: {
		18: [{ code: "missing" }],
		28: [{ code: "missing" }],
		36: [{ code: "implant" }],
		16: [{ code: "caries", sigla: "CD", surfaces: ["O", "M"] }],
	},
	periodontogram: {
		17: {
			sites: { DV: { pd: 5, gm: 2, bleeding: true }, V: { pd: 4, gm: 1 } },
		},
		16: {
			sites: { MV: { pd: 6, gm: 2, bleeding: true } },
			furcation: { V: 1 },
		},
	},
};

/** One patient state feeding both charts; export/import as JSON. */
function IntegrationDemo() {
	const [chart, setChart] = useState<PatientChart>(SAMPLE);
	const [text, setText] = useState("");
	const [error, setError] = useState("");
	const [selection, setSelection] = useState<OdontogramSelection | null>(null);

	/** Toggles a whole-tooth finding on the selected tooth. */
	const toggle = (code: FindingCode) => {
		if (!selection) {
			return;
		}
		const { fdi } = selection;
		const list = chart.odontogram[fdi] ?? [];
		const odontogram = list.some((f) => f.code === code)
			? { ...chart.odontogram, [fdi]: list.filter((f) => f.code !== code) }
			: addFinding(chart.odontogram, fdi, { code });
		setChart({ ...chart, odontogram });
	};

	const load = () => {
		try {
			setChart(parsePatientChart(text));
			setError("");
		} catch (e) {
			setError((e as Error).message);
		}
	};
	return (
		<div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
			<p>
				Selecciona un diente en el odontograma y márcalo como ausente o con
				implante: el periodontograma lo refleja y lo bloquea.
			</p>
			<p>
				<strong>
					{selection ? `Diente ${selection.fdi}` : "Ningún diente seleccionado"}
				</strong>{" "}
				<button
					type="button"
					disabled={!selection}
					onClick={() => toggle("missing")}
				>
					Ausente
				</button>{" "}
				<button
					type="button"
					disabled={!selection}
					onClick={() => toggle("implant")}
				>
					Implante
				</button>
			</p>
			<Odontogram
				dentition="permanent"
				value={chart.odontogram}
				marks={chart.marks}
				selection={selection}
				onSelectionChange={setSelection}
				style={{ maxWidth: 900 }}
			/>
			<div style={{ overflowX: "auto", marginTop: 24 }}>
				<Periodontogram
					value={chart.periodontogram}
					odontogram={chart.odontogram}
					onChange={(periodontogram) => setChart({ ...chart, periodontogram })}
				/>
			</div>
			<h3>Exportar</h3>
			<pre
				style={{
					fontSize: 11,
					maxHeight: 200,
					overflow: "auto",
					background: "#f3f4f6",
				}}
			>
				{JSON.stringify(chart)}
			</pre>
			<h3>Importar</h3>
			<textarea
				value={text}
				onChange={(e) => setText(e.target.value)}
				rows={4}
				style={{ width: "100%" }}
				aria-label="JSON del paciente"
			/>
			<button type="button" onClick={load}>
				Cargar
			</button>
			{error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
		</div>
	);
}

const meta: Meta<typeof IntegrationDemo> = {
	title: "Integración",
	component: IntegrationDemo,
};
export default meta;

export const Patient: StoryObj<typeof IntegrationDemo> = {
	name: "Paciente (odontograma + periodontograma)",
};
