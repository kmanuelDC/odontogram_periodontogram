import type { Meta, StoryObj } from "@storybook/react-webpack5";
import { useState } from "react";
import {
	type MarkZone,
	type ToothMark,
	ToothSvg,
} from "../components/ToothSvg";

const TEETH = [16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26];

function BrushDemo({
	pxPerMm,
	brushColor,
}: { pxPerMm: number; brushColor: string }) {
	// In your app: load `marks` from your backend and save them in onMarksChange.
	const [marks, setMarks] = useState<ToothMark[]>([]);
	const [selected, setSelected] = useState<{
		fdi: number;
		zone: MarkZone;
	} | null>(null);
	const brush = { marks, onMarksChange: setMarks, brushColor, pxPerMm };
	return (
		<div style={{ fontFamily: "sans-serif", fontSize: 12 }}>
			<p>
				Clic sobre un diente: agrega un punto. Clic sobre un punto: lo quita.
				Clic sobre el círculo: selecciona la cara (
				{selected ? `${selected.fdi} · ${selected.zone}` : "ninguna"}).
			</p>
			<div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
				{TEETH.map((fdi) => (
					<div
						key={fdi}
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 4,
						}}
					>
						<ToothSvg fdi={fdi} view="lateral" {...brush} />
						<ToothSvg
							fdi={fdi}
							view="occlusal"
							pxPerMm={pxPerMm}
							onZoneSelect={(zone) => setSelected({ fdi, zone })}
							selectedZone={selected?.fdi === fdi ? selected.zone : null}
						/>
						<strong>{fdi}</strong>
					</div>
				))}
			</div>
			<pre
				style={{
					background: "#f3f4f6",
					padding: 8,
					maxHeight: 240,
					overflow: "auto",
				}}
			>
				{JSON.stringify(marks, null, 2)}
			</pre>
		</div>
	);
}

const meta: Meta<typeof BrushDemo> = {
	title: "Pincel",
	component: BrushDemo,
	args: { pxPerMm: 10, brushColor: "#dc2626" },
	argTypes: {
		pxPerMm: { control: { type: "range", min: 4, max: 14, step: 1 } },
		brushColor: { control: "color" },
	},
};
export default meta;

export const Brush: StoryObj<typeof BrushDemo> = { name: "Marcar puntos" };
