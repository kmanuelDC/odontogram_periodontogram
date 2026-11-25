import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { ALL_FDI, toothInfo } from "../anatomy/fdi";
import { ToothSvg } from "../components/ToothSvg";

const range = (from: number, to: number) => {
	const step = from < to ? 1 : -1;
	return Array.from(
		{ length: Math.abs(to - from) + 1 },
		(_, i) => from + i * step,
	);
};

// Chart order, as in the NTS reference sheet.
const ROWS = [
	[...range(18, 11), ...range(21, 28)],
	[...range(55, 51), ...range(61, 65)],
	[...range(85, 81), ...range(71, 75)],
	[...range(48, 41), ...range(31, 38)],
];

function Column({ fdi, pxPerMm }: { fdi: number; pxPerMm: number }) {
	const upper = toothInfo(fdi).arch === "upper";
	const views = [
		<ToothSvg key="l" fdi={fdi} view="lateral" pxPerMm={pxPerMm} />,
		<ToothSvg key="o" fdi={fdi} view="occlusal" pxPerMm={pxPerMm} />,
	];
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: upper ? "flex-end" : "flex-start",
				gap: 4,
			}}
		>
			{upper ? null : <strong>{fdi}</strong>}
			{upper ? views : views.reverse()}
			{upper ? <strong>{fdi}</strong> : null}
		</div>
	);
}

function AnatomyChart({ pxPerMm }: { pxPerMm: number }) {
	return (
		<div
			style={{
				fontFamily: "sans-serif",
				fontSize: 12,
				width: "max-content",
				margin: "0 auto",
			}}
		>
			{ROWS.map((row) => (
				<div
					key={row[0]}
					style={{
						display: "flex",
						justifyContent: "center",
						alignItems:
							toothInfo(row[0]).arch === "upper" ? "flex-end" : "flex-start",
						gap: 6,
						margin: "12px 0",
					}}
				>
					{row.map((fdi) => (
						<Column key={fdi} fdi={fdi} pxPerMm={pxPerMm} />
					))}
				</div>
			))}
		</div>
	);
}

const meta: Meta<typeof AnatomyChart> = {
	title: "Anatomía",
	component: AnatomyChart,
	args: { pxPerMm: 12 },
	argTypes: {
		pxPerMm: { control: { type: "range", min: 2, max: 12, step: 1 } },
	},
};
export default meta;

export const AllTeeth: StoryObj<typeof AnatomyChart> = {
	name: "52 dientes",
};

export const SingleTooth: StoryObj<typeof ToothSvg> = {
	name: "Un diente",
	render: (args) => (
		<div style={{ display: "flex", gap: 24, alignItems: "center" }}>
			<ToothSvg {...args} view="lateral" />
			<ToothSvg {...args} view="occlusal" />
		</div>
	),
	args: { fdi: 16, pxPerMm: 12 },
	argTypes: { fdi: { control: "select", options: ALL_FDI } },
};
