import { render } from "@testing-library/react";
import axe from "axe-core";
import type { ReactElement } from "react";
import {
	FindingPicker,
	Odontogram,
	type OdontogramValue,
	type PerioChart,
	Periodontogram,
	ToothSvg,
} from "../src";

const VALUE: OdontogramValue = {
	18: [{ code: "missing" }],
	16: [{ code: "caries", sigla: "CD", surfaces: ["O", "M"] }],
	46: [{ code: "fixedProsthesis", to: 44 }],
};

const PERIO: PerioChart = {
	16: { sites: { MV: { pd: 5, gm: 2, bleeding: true } }, furcation: { V: 1 } },
	17: { missing: true },
};

async function violations(ui: ReactElement) {
	const { container } = render(<main>{ui}</main>);
	const result = await axe.run(container, {
		// jsdom has no layout or colours: contrast is checked visually in Storybook.
		rules: { "color-contrast": { enabled: false } },
	});
	return result.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}`);
}

const noop = () => undefined;

it.each([
	["read-only tooth", <ToothSvg key="t" fdi={16} findings={VALUE[16]} />],
	["tooth with brush", <ToothSvg key="b" fdi={16} onMarksChange={noop} />],
	["read-only odontogram", <Odontogram key="o" value={VALUE} />],
	[
		"odontogram in select mode",
		<Odontogram
			key="s"
			value={VALUE}
			selection={{ fdi: 16, zone: "M" }}
			onSelectionChange={noop}
		/>,
	],
	[
		"odontogram in brush mode",
		<Odontogram
			key="br"
			value={VALUE}
			mode="brush"
			marks={[]}
			onMarksChange={noop}
		/>,
	],
	[
		"finding picker",
		<FindingPicker
			key="fp"
			fdi={16}
			zone="M"
			findings={VALUE[16] ?? []}
			onAdd={noop}
			onRemove={noop}
			onClose={noop}
		/>,
	],
	["read-only periodontogram", <Periodontogram key="p" value={PERIO} />],
	[
		"editable periodontogram with odontogram",
		<Periodontogram
			key="pe"
			value={PERIO}
			odontogram={VALUE}
			onChange={noop}
		/>,
	],
])(
	"%s has no axe violations",
	async (_, ui) => {
		expect(await violations(ui)).toEqual([]);
	},
	30_000,
);
