import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import { Periodontogram } from "../components/Periodontogram";
import { type PerioChart, SITES } from "../perio/model";

const sites = (pd: number, gm: number, bleeding = false) =>
	Object.fromEntries(SITES.map((s) => [s, { pd, gm, bleeding }]));

/** Moderate periodontitis on the molars, a missing 18, an implant on 36. */
const SAMPLE: PerioChart = {
	18: { missing: true },
	17: { sites: sites(5, 2, true), mobility: 1, furcation: { V: 1 } },
	16: {
		sites: {
			...sites(4, 1),
			MV: { pd: 6, gm: 2, bleeding: true },
			DL: { pd: 7, gm: 3, bleeding: true, suppuration: true },
		},
		furcation: { V: 2, MP: 1 },
		mobility: 1,
	},
	15: { sites: sites(3, 0) },
	14: { sites: sites(3, 1), furcation: { M: 1 } },
	13: { sites: sites(2, 2), keratinized: 3 },
	12: { sites: sites(2, 0) },
	11: { sites: sites(2, -1, true) },
	21: { sites: sites(3, -1, true) },
	36: { implant: true, sites: sites(4, 0) },
	46: {
		sites: {
			...sites(5, 1, true),
			V: { pd: 6, gm: 2, bleeding: true, plaque: true },
		},
		furcation: { V: 2, L: 1 },
	},
};

function Demo({ initial }: { initial: PerioChart }) {
	const [value, setValue] = useState<PerioChart>(initial);
	return (
		<div style={{ overflowX: "auto" }}>
			<Periodontogram value={value} onChange={setValue} />
			<details>
				<summary>JSON guardado</summary>
				<pre style={{ fontSize: 11 }}>{JSON.stringify(value, null, 1)}</pre>
			</details>
		</div>
	);
}

const meta: Meta<typeof Demo> = {
	title: "Periodontograma",
	component: Demo,
};
export default meta;

export const Example: StoryObj<typeof Demo> = {
	name: "Ficha de ejemplo",
	args: { initial: SAMPLE },
};

export const Empty: StoryObj<typeof Demo> = {
	name: "Ficha vacía",
	args: { initial: {} },
};
