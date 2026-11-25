import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import { Odontogram } from "../components/Odontogram";
import type { OdontogramSelection } from "../components/Odontogram";
import type { ToothMark } from "../components/ToothSvg";

const meta: Meta<typeof Odontogram> = {
	title: "Odontograma",
	component: Odontogram,
	args: { dentition: "mixed" },
	argTypes: {
		dentition: {
			control: "inline-radio",
			options: ["mixed", "permanent", "primary"],
		},
	},
	// Resize the canvas: the chart scales and switches detail on by itself.
	decorators: [
		(Story) => (
			<div style={{ resize: "horizontal", overflow: "auto", maxWidth: "100%" }}>
				<Story />
			</div>
		),
	],
};
export default meta;
type Story = StoryObj<typeof Odontogram>;

export const Mixed: Story = { name: "Mixta (ficha NTS)" };

export const Permanent: Story = {
	name: "Permanente",
	args: { dentition: "permanent" },
};

export const Primary: Story = {
	name: "Temporal",
	args: { dentition: "primary" },
};

export const WithBoxes: Story = {
	name: "Con casilleros",
	args: {
		boxes: {
			18: "DAO",
			16: "CE",
			12: "DAO",
			22: "DAO",
			26: "AM",
			28: "DAO",
			48: "DAO",
			47: "CE",
			46: "FFP",
			36: "AM",
			37: "CE",
			38: "DAO",
		},
	},
};

function WithBrushDemo(args: Parameters<typeof Odontogram>[0]) {
	const [marks, setMarks] = useState<ToothMark[]>([]);
	const [selection, setSelection] = useState<OdontogramSelection | null>(null);
	return (
		<>
			<Odontogram
				{...args}
				marks={marks}
				onMarksChange={setMarks}
				selection={selection}
				onSelectionChange={setSelection}
			/>
			<p>
				Selección: {selection ? `${selection.fdi} · ${selection.zone}` : "—"}
			</p>
			<pre
				style={{
					background: "#f3f4f6",
					padding: 8,
					maxHeight: 200,
					overflow: "auto",
				}}
			>
				{JSON.stringify(marks, null, 2)}
			</pre>
		</>
	);
}

export const WithBrush: Story = {
	name: "Con pincel",
	args: { mode: "brush" },
	render: (args) => <WithBrushDemo {...args} />,
};
