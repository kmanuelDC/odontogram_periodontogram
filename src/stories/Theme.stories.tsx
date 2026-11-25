import type { Meta, StoryObj } from "@storybook/react-webpack5";
import type { CSSProperties, ReactNode } from "react";
import { Odontogram } from "../components/Odontogram";
import { Periodontogram } from "../components/Periodontogram";
import type { OdontogramValue } from "../findings/model";
import type { PerioChart } from "../perio/model";

const VALUE: OdontogramValue = {
	18: [{ code: "missing" }],
	16: [{ code: "caries", sigla: "CD", surfaces: ["O", "M"] }],
	26: [{ code: "restoration", sigla: "AM", surfaces: ["O"], state: "good" }],
	37: [{ code: "crown", sigla: "CM", state: "bad" }],
	46: [{ code: "fixedProsthesis", to: 44 }],
};

const PERIO: PerioChart = {
	17: {
		sites: {
			DV: { pd: 5, gm: 2, bleeding: true },
			V: { pd: 4, gm: 1 },
			MV: { pd: 6, gm: 2, plaque: true },
		},
	},
	16: {
		sites: {
			DV: { pd: 4, gm: 1 },
			V: { pd: 3, gm: 0, suppuration: true },
			MV: { pd: 5, gm: 1, bleeding: true },
		},
	},
};

function Panel({
	title,
	className,
	style,
	children,
}: {
	title: string;
	className?: string;
	style?: CSSProperties;
	children: ReactNode;
}) {
	return (
		<section
			className={className}
			style={{
				background: "var(--odp-bg)",
				color: "var(--odp-text)",
				padding: 16,
				borderRadius: 8,
				...style,
			}}
		>
			<h3 style={{ marginTop: 0, fontFamily: "sans-serif" }}>{title}</h3>
			{children}
		</section>
	);
}

/** Light, dark and a custom palette side by side. */
function ThemeShowcase() {
	return (
		<div style={{ display: "grid", gap: 16 }}>
			<div
				style={{
					display: "grid",
					gap: 16,
					gridTemplateColumns: "repeat(3, 1fr)",
				}}
			>
				<Panel title="Claro (por defecto)" className="odp-theme-light">
					<Odontogram dentition="permanent" value={VALUE} />
				</Panel>
				<Panel title="Oscuro · odp-theme-dark" className="odp-theme-dark">
					<Odontogram dentition="permanent" value={VALUE} />
				</Panel>
				<Panel
					title="Personalizado (variables CSS)"
					style={
						{
							"--odp-stroke": "#334155",
							"--odp-text": "#0f766e",
							"--odp-border": "#5eead4",
							"--odp-line": "#99f6e4",
							"--odp-bg": "#f0fdfa",
						} as CSSProperties
					}
				>
					<Odontogram dentition="permanent" value={VALUE} />
				</Panel>
			</div>
			<Panel
				title="Periodontograma en oscuro"
				className="odp-theme-dark"
				style={{ overflowX: "auto" }}
			>
				<Periodontogram value={PERIO} />
			</Panel>
		</div>
	);
}

/** What a printed A4 sheet looks like: use the browser's print preview. */
function PrintSheet() {
	return (
		<div style={{ maxWidth: "190mm", fontFamily: "sans-serif" }}>
			<button type="button" onClick={() => window.print()}>
				Imprimir / vista previa
			</button>
			<h2>Odontograma</h2>
			<Odontogram dentition="mixed" value={VALUE} />
			<h2 style={{ breakBefore: "page" }}>Periodontograma</h2>
			<Periodontogram value={PERIO} />
			<p style={{ marginTop: "15mm" }}>
				Firma y sello: ________________________________
			</p>
		</div>
	);
}

const meta: Meta = { title: "Tema" };
export default meta;

export const Themes: StoryObj = {
	name: "Claro, oscuro y personalizado",
	render: () => <ThemeShowcase />,
};

export const Print: StoryObj = {
	name: "Hoja para imprimir (A4)",
	render: () => <PrintSheet />,
};
