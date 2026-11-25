import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import { Odontogram } from "../components/Odontogram";
import type { ToothMark } from "../components/ToothSvg";
import type { OdontogramValue } from "../findings/model";

/** Example from the reference sheet (odontograma.png). */
const SAMPLE: OdontogramValue = {
	18: [{ code: "missing" }],
	16: [{ code: "caries", sigla: "CE", surfaces: ["D"] }],
	12: [{ code: "missing" }],
	22: [{ code: "missing" }],
	23: [{ code: "diastema", to: 24 }],
	26: [{ code: "restoration", sigla: "AM", surfaces: ["O"], state: "good" }],
	28: [{ code: "missing" }],
	48: [{ code: "missing" }],
	47: [{ code: "crown", sigla: "CM", state: "bad" }],
	46: [{ code: "fixedProsthesis", to: 44, state: "bad" }],
	36: [{ code: "restoration", sigla: "AM", surfaces: ["O"], state: "good" }],
	37: [{ code: "crown", sigla: "CM", state: "bad" }],
	38: [{ code: "missing" }],
	14: [{ code: "pulpTreatment", sigla: "TC" }],
	13: [{ code: "rotated" }],
	11: [{ code: "extruded" }],
	21: [{ code: "implant" }],
	25: [{ code: "migrated", direction: "distal" }],
	33: [{ code: "orthodonticFixed", to: 43 }],
};

/** Built-in editing: pass onChange and a click on a zone opens the picker. */
function FindingsDemo({
	dentition,
}: { dentition: "mixed" | "permanent" | "primary" }) {
	const [value, setValue] = useState<OdontogramValue>(SAMPLE);
	const [mode, setMode] = useState<"select" | "brush">("select");
	const [marks, setMarks] = useState<ToothMark[]>([]);
	return (
		<div style={{ fontFamily: "sans-serif", fontSize: 13 }}>
			<label style={{ display: "block", marginBottom: 8 }}>
				Modo{" "}
				<select
					value={mode}
					onChange={(e) => setMode(e.target.value as "select" | "brush")}
				>
					<option value="select">Seleccionar</option>
					<option value="brush">Pincel</option>
				</select>{" "}
				Clic en una cara o en el diente para agregar un hallazgo.
			</label>
			<Odontogram
				dentition={dentition}
				value={value}
				onChange={setValue}
				mode={mode}
				marks={marks}
				onMarksChange={setMarks}
			/>
			<details>
				<summary>JSON guardado</summary>
				<pre style={{ fontSize: 11, maxHeight: 240, overflow: "auto" }}>
					{JSON.stringify({ value, marks }, null, 1)}
				</pre>
			</details>
		</div>
	);
}

const meta: Meta<typeof FindingsDemo> = {
	title: "Hallazgos NTS",
	component: FindingsDemo,
	args: { dentition: "permanent" },
	argTypes: {
		dentition: {
			control: "inline-radio",
			options: ["mixed", "permanent", "primary"],
		},
	},
};
export default meta;

export const Editor: StoryObj<typeof FindingsDemo> = {
	name: "Editor de hallazgos",
};
