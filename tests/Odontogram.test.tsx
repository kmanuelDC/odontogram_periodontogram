import { fireEvent, render } from "@testing-library/react";
import {
	type Finding,
	Odontogram,
	type OdontogramValue,
	type ToothMark,
} from "../src";

const FINDING_BUTTON = /^Hallazgo/;

it("draws the full mixed chart by default", () => {
	const { getByRole, container } = render(<Odontogram />);
	expect(getByRole("group", { name: "Odontograma" })).toBeInTheDocument();
	expect(container.querySelectorAll('svg[data-view="lateral"]')).toHaveLength(
		52,
	);
	expect(container.querySelectorAll('svg[data-view="occlusal"]')).toHaveLength(
		52,
	);
});

it.each([
	["permanent", 32],
	["primary", 20],
] as const)("draws only the %s teeth", (dentition, count) => {
	const { container } = render(<Odontogram dentition={dentition} />);
	expect(container.querySelectorAll('svg[data-view="lateral"]')).toHaveLength(
		count,
	);
});

it("shows the NTS box text of each tooth", () => {
	const { container } = render(
		<Odontogram dentition="permanent" boxes={{ 18: "DAO", 16: "CE" }} />,
	);
	const text = (fdi: number) =>
		container.querySelector(`g[data-fdi="${fdi}"] .odp-box-text`)?.textContent;
	expect(text(18)).toBe("DAO");
	expect(text(16)).toBe("CE");
	expect(text(11)).toBe("");
});

it("passes the brush to every tooth, lateral view only", () => {
	const onMarksChange = vi.fn();
	const { getByRole, queryByRole } = render(
		<Odontogram
			dentition="permanent"
			mode="brush"
			marks={[]}
			onMarksChange={onMarksChange}
		/>,
	);
	fireEvent.keyDown(
		getByRole("button", { name: "Agregar marca en corona, diente 36" }),
		{
			key: "Enter",
		},
	);
	const [[[mark]]] = onMarksChange.mock.calls as ToothMark[][][];
	expect(mark).toMatchObject({ fdi: 36, view: "lateral", zone: "crown" });
	expect(queryByRole("button", { name: "Diente 36, mesial" })).toBeNull();
});

it("keeps the circles selectable in brush mode when the host listens", () => {
	const onMarksChange = vi.fn();
	const onSelectionChange = vi.fn();
	const { getByRole, queryByRole } = render(
		<Odontogram
			dentition="permanent"
			mode="brush"
			marks={[]}
			onMarksChange={onMarksChange}
			onSelectionChange={onSelectionChange}
		/>,
	);
	fireEvent.keyDown(getByRole("button", { name: "Diente 36, mesial" }), {
		key: "Enter",
	});
	expect(onSelectionChange).toHaveBeenCalledWith({ fdi: 36, zone: "M" });
	expect(onMarksChange).not.toHaveBeenCalled();
	// The tooth itself paints instead of selecting.
	expect(queryByRole("button", { name: "Diente 36, corona" })).toBeNull();
	getByRole("button", { name: "Agregar marca en corona, diente 36" });
});

describe("findings", () => {
	const value: OdontogramValue = {
		16: [{ code: "caries", sigla: "CD", surfaces: ["O", "M"] }],
		11: [{ code: "crown", state: "bad" }],
		18: [{ code: "missing" }],
		13: [{ code: "fixedProsthesis", to: 23 }],
	};

	it("draws each finding with its NTS colour", () => {
		const { container } = render(
			<Odontogram dentition="permanent" value={value} />,
		);
		const f = (fdi: number, code: string) =>
			container.querySelectorAll(
				`svg[data-fdi="${fdi}"] [data-finding="${code}"]`,
			);
		// Caries: two filled surfaces in the occlusal view, red.
		expect(f(16, "caries")).toHaveLength(1);
		expect(f(16, "caries")[0].querySelectorAll(".odp-f-fill")).toHaveLength(2);
		expect(f(16, "caries")[0]).toHaveClass("odp-f-bad");
		// Missing: X in both views, blue.
		expect(f(18, "missing")).toHaveLength(2);
		expect(f(18, "missing")[0]).toHaveClass("odp-f-good");
		// Bridge: one chart-level span.
		expect(
			container.querySelectorAll('[data-finding="fixedProsthesis"]'),
		).toHaveLength(1);
	});

	it.each([
		["orthodonticRemovable", { to: 26 }],
		["removableProsthesis", { to: 26 }],
		["totalProsthesis", { to: 28 }],
		["edentulous", { to: 28 }],
		["fusion", { to: 22 }],
		["transposition", { to: 24 }],
		["supernumerary", { to: 22 }],
		["peg", {}],
		["gemination", {}],
	])("draws %s once on the chart", (code, extra) => {
		const { container } = render(
			<Odontogram
				dentition="permanent"
				value={{ 21: [{ code, ...extra } as Finding] }}
			/>,
		);
		const g = container.querySelectorAll(`[data-finding="${code}"]`);
		expect(g).toHaveLength(1);
		expect(g[0].querySelector("path")?.getAttribute("d")).not.toContain("NaN");
	});

	it("draws a post-core and a root fracture on the side view", () => {
		const { container } = render(
			<Odontogram
				dentition="permanent"
				value={{
					11: [{ code: "postCore", state: "bad" }],
					21: [{ code: "fracture", location: "root" }],
				}}
			/>,
		);
		const side = (fdi: number, code: string) =>
			container.querySelector(
				`svg[data-fdi="${fdi}"][data-view="lateral"] [data-finding="${code}"] path`,
			);
		expect(side(11, "postCore")?.getAttribute("d")).not.toContain("NaN");
		expect(side(11, "postCore")?.parentElement).toHaveClass("odp-f-bad");
		expect(side(21, "fracture")?.getAttribute("d")).not.toContain("NaN");
	});

	it("writes RR on the root, not in the box", () => {
		const { container } = render(
			<Odontogram
				dentition="permanent"
				value={{ 45: [{ code: "rootRemnant" }] }}
			/>,
		);
		const rr = container.querySelector(
			'svg[data-fdi="45"][data-view="lateral"] [data-finding="rootRemnant"]',
		);
		expect(rr?.textContent).toBe("RR");
		expect(rr).toHaveClass("odp-f-bad");
		expect(
			container.querySelector('g[data-fdi="45"] .odp-box-text')?.textContent,
		).toBe("");
	});

	it("writes the siglas in the box, coloured by state", () => {
		const { container } = render(
			<Odontogram dentition="permanent" value={value} boxes={{ 16: "obs" }} />,
		);
		const box = container.querySelector('g[data-fdi="16"] .odp-box-text');
		expect(box?.textContent).toBe("CD obs");
		expect(box?.querySelector(".odp-box-bad")?.textContent).toBe("CD");
	});

	it("labels teeth with their findings", () => {
		const { getAllByRole } = render(
			<Odontogram dentition="permanent" value={value} />,
		);
		// Both views (lateral and occlusal) carry the label.
		expect(
			getAllByRole("img", { name: "Diente 16: Caries CD (O, M)" }),
		).toHaveLength(2);
	});

	it("ignores unknown finding codes instead of crashing", () => {
		const bad = {
			16: [{ code: "fromTheFuture" }],
		} as unknown as OdontogramValue;
		expect(() => render(<Odontogram value={bad} />)).not.toThrow();
	});
});

describe("selection and keyboard", () => {
	it("selects a zone by click", () => {
		const onSelectionChange = vi.fn();
		const { getByRole } = render(
			<Odontogram
				dentition="permanent"
				onSelectionChange={onSelectionChange}
			/>,
		);
		fireEvent.click(getByRole("button", { name: "Diente 26, mesial" }));
		expect(onSelectionChange).toHaveBeenCalledWith({ fdi: 26, zone: "M" });
	});

	it("marks the selected zone", () => {
		const { getByRole } = render(
			<Odontogram
				dentition="permanent"
				selection={{ fdi: 26, zone: "M" }}
				onSelectionChange={() => undefined}
			/>,
		);
		expect(getByRole("button", { name: "Diente 26, mesial" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("keeps a single Tab stop and moves with the arrows", () => {
		const { container, getByRole } = render(
			<Odontogram dentition="permanent" onSelectionChange={() => undefined} />,
		);
		const tabbable = container.querySelectorAll(
			'[role="button"][tabindex="0"]',
		);
		expect(tabbable).toHaveLength(1);
		expect(tabbable[0]).toHaveAccessibleName("Diente 18, oclusal/incisal");

		const start = tabbable[0] as SVGElement;
		start.focus();
		fireEvent.keyDown(start, { key: "ArrowRight" });
		expect(document.activeElement).toBe(
			getByRole("button", { name: "Diente 17, oclusal/incisal" }),
		);
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
		expect(document.activeElement).toBe(
			getByRole("button", { name: "Diente 17, mesial" }),
		);
		expect(
			container.querySelectorAll('[role="button"][tabindex="0"]'),
		).toHaveLength(1);
	});
});

describe("finding picker", () => {
	function setup(value: OdontogramValue = {}) {
		const onChange = vi.fn();
		const utils = render(
			<Odontogram dentition="permanent" value={value} onChange={onChange} />,
		);
		const pick = (name: string) => {
			fireEvent.click(utils.getByRole("button", { name: FINDING_BUTTON }));
			fireEvent.click(utils.getByRole("option", { name }));
		};
		return { ...utils, onChange, pick };
	}

	it("opens on a zone and adds the finding on that surface", () => {
		const { getByRole, queryByRole, onChange, pick } = setup();
		expect(queryByRole("dialog")).toBeNull();
		fireEvent.click(getByRole("button", { name: "Diente 16, mesial" }));
		getByRole("dialog", { name: "Hallazgos: diente 16, mesial" });
		pick("Caries");
		fireEvent.click(getByRole("button", { name: "Registrar hallazgo" }));
		expect(onChange).toHaveBeenCalledWith({
			16: [{ code: "caries", surfaces: ["M"] }],
		});
	});

	it("lists findings with their symbol, grouped, and only whole-tooth ones on the crown", () => {
		const { getByRole, queryByRole } = setup();
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		fireEvent.click(getByRole("button", { name: FINDING_BUTTON }));
		const listbox = getByRole("listbox", { name: "Hallazgo" });
		expect(getByRole("group", { name: "Diente" })).toBeInTheDocument();
		expect(queryByRole("group", { name: "Caras" })).toBeNull();
		expect(queryByRole("option", { name: "Caries" })).toBeNull();
		// Every option carries its NTS symbol.
		const options = listbox.querySelectorAll('[role="option"]');
		for (const o of options) {
			expect(o.querySelector(".odp-icon")).not.toBeNull();
		}
	});

	it("offers only the codes the host allows", () => {
		const { getByRole, queryByRole } = render(
			<Odontogram
				dentition="permanent"
				onChange={vi.fn()}
				codes={["crown", "missing"]}
			/>,
		);
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		fireEvent.click(getByRole("button", { name: FINDING_BUTTON }));
		expect(getByRole("option", { name: "Corona definitiva" })).toBeTruthy();
		expect(getByRole("option", { name: "Diente ausente" })).toBeTruthy();
		expect(queryByRole("option", { name: "Extracción indicada" })).toBeNull();
		expect(queryByRole("option", { name: "Corona temporal" })).toBeNull();
	});

	it("moves through the list with the keyboard", () => {
		const { getByRole } = setup();
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		const button = getByRole("button", { name: FINDING_BUTTON });
		fireEvent.keyDown(button, { key: "ArrowDown" });
		const listbox = getByRole("listbox");
		fireEvent.keyDown(listbox, { key: "ArrowDown" });
		fireEvent.keyDown(listbox, { key: "Enter" });
		expect(getByRole("button", { name: FINDING_BUTTON }).textContent).toBe(
			"Corona temporal",
		);
	});

	it("shows what each sigla means", () => {
		const { getByRole } = setup();
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		fireEvent.keyDown(getByRole("button", { name: FINDING_BUTTON }), {
			key: "c",
		});
		const search = getByRole("combobox", { name: "Buscar hallazgo" });
		fireEvent.change(search, { target: { value: "corona def" } });
		fireEvent.keyDown(search, { key: "Enter" });
		expect(
			getByRole("radio", { name: "CLM Corona libre de metal" }),
		).toBeTruthy();
	});

	it("filters the list by name or sigla, ignoring accents", () => {
		const { getByRole, queryByRole } = setup();
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		// Typing on the closed button opens the list with that query.
		fireEvent.keyDown(getByRole("button", { name: FINDING_BUTTON }), {
			key: "p",
		});
		const search = getByRole("combobox", { name: "Buscar hallazgo" });
		expect(search).toHaveFocus();
		fireEvent.change(search, { target: { value: "protesis rem" } });
		expect(getByRole("option", { name: "Prótesis removible" })).toBeTruthy();
		expect(queryByRole("option", { name: "Prótesis total" })).toBeNull();
		fireEvent.change(search, { target: { value: "rr" } });
		fireEvent.keyDown(search, { key: "Enter" });
		expect(getByRole("button", { name: FINDING_BUTTON })).toHaveTextContent(
			"Remanente radicular",
		);
	});

	it("hides absent teeth, except for spans over gaps", () => {
		const { getByRole, pick } = setup({ 15: [{ code: "missing" }] });
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		const offered = () =>
			[
				...getByRole("combobox", { name: "Hasta la pieza" }).querySelectorAll(
					"option",
				),
			].map((o) => o.value);
		pick("Prótesis fija");
		expect(offered()).not.toContain("15");
		pick("Prótesis removible");
		expect(offered()).toContain("15");
	});

	it("offers only the neighbours for a diastema", () => {
		const { getByRole, pick } = setup();
		fireEvent.click(getByRole("button", { name: "Diente 11, corona" }));
		pick("Diastema");
		const to = getByRole("combobox", { name: "Hasta la pieza" });
		expect(
			[...to.querySelectorAll("option")].map((o) => o.value).filter(Boolean),
		).toEqual(["12", "21"]);
	});

	it("hides the findings the clinical rules reject", () => {
		const { getByRole, queryByRole } = setup({
			16: [{ code: "missing" }],
			26: [{ code: "extraction" }, { code: "caries", surfaces: ["O"] }],
		});
		const options = () =>
			[...getByRole("listbox").querySelectorAll('[role="option"]')].map(
				(o) => o.textContent,
			);
		const open = (name: string) => {
			fireEvent.click(getByRole("button", { name }));
			fireEvent.click(getByRole("button", { name: FINDING_BUTTON }));
		};
		// Absent tooth: nothing on the tooth, only spans over gaps.
		open("Diente 16, corona");
		expect(options().some((t) => t?.includes("Corona definitiva"))).toBe(false);
		expect(options().some((t) => t?.includes("Extracción indicada"))).toBe(
			false,
		);
		expect(options().some((t) => t?.includes("Prótesis removible"))).toBe(true);
		expect(options().some((t) => t?.includes("Prótesis fija"))).toBe(false);
		fireEvent.keyDown(getByRole("listbox"), { key: "Escape" });
		fireEvent.keyDown(getByRole("dialog"), { key: "Escape" });
		expect(queryByRole("dialog")).toBeNull();
		// Extraction already there; caries hidden on O, offered on M.
		open("Diente 26, oclusal/incisal");
		expect(options().some((t) => t?.includes("Extracción indicada"))).toBe(
			false,
		);
		expect(options().some((t) => t?.includes("Caries"))).toBe(false);
		fireEvent.keyDown(getByRole("listbox"), { key: "Escape" });
		fireEvent.keyDown(getByRole("dialog"), { key: "Escape" });
		open("Diente 26, mesial");
		expect(options().some((t) => t?.includes("Caries"))).toBe(true);
	});

	it("shows validation errors, removes, and closes with Escape or an outside click", () => {
		const { getByRole, queryByRole, onChange, pick } = setup({
			16: [{ code: "missing" }],
		});
		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		pick("Prótesis removible");
		fireEvent.click(getByRole("button", { name: "Registrar hallazgo" }));
		expect(getByRole("alert").textContent).toBe(
			"Prótesis removible: elige hasta qué pieza llega",
		);
		// The error belongs to the "up to tooth" field and is announced with it.
		const to = getByRole("combobox", { name: "Hasta la pieza" });
		expect(to).toHaveAttribute("aria-invalid", "true");
		// Only teeth of the same arch, without the tooth itself.
		expect(
			[...to.querySelectorAll("option")].map((o) => o.value).filter(Boolean),
		).toEqual("18 17 15 14 13 12 11 21 22 23 24 25 26 27 28".split(" "));
		expect(onChange).not.toHaveBeenCalled();

		fireEvent.click(getByRole("button", { name: "Quitar Diente ausente" }));
		expect(onChange).toHaveBeenCalledWith({});

		fireEvent.keyDown(getByRole("dialog"), { key: "Escape" });
		expect(queryByRole("dialog")).toBeNull();

		fireEvent.click(getByRole("button", { name: "Diente 16, corona" }));
		fireEvent.pointerDown(getByRole("dialog"));
		expect(queryByRole("dialog")).not.toBeNull();
		fireEvent.pointerDown(document.body);
		expect(queryByRole("dialog")).toBeNull();
	});
});
