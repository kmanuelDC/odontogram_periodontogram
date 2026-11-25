import { fireEvent, render } from "@testing-library/react";
import { GEOMETRY_VERSION, type ToothMark, ToothSvg } from "../src";

it("renders the lateral view with crown and roots", () => {
	const { getByRole } = render(<ToothSvg fdi={16} />);
	const svg = getByRole("img", { name: "Diente 16" });
	expect(svg.querySelector(".odp-crown")).not.toBeNull();
	expect(svg.querySelector(".odp-root")).not.toBeNull();
});

it("renders the five occlusal surfaces", () => {
	const { container } = render(<ToothSvg fdi={36} view="occlusal" />);
	const surfaces = [...container.querySelectorAll("[data-surface]")];
	expect(surfaces.map((s) => s.getAttribute("data-surface"))).toEqual([
		"V",
		"L",
		"M",
		"D",
		"O",
	]);
});

it("shows fine anatomy only at large sizes unless forced", () => {
	const small = render(<ToothSvg fdi={11} pxPerMm={4} />);
	expect(small.container.querySelector(".odp-detail")).toBeNull();
	const large = render(<ToothSvg fdi={11} pxPerMm={12} />);
	expect(large.container.querySelector(".odp-detail")).not.toBeNull();
	const forced = render(<ToothSvg fdi={11} pxPerMm={4} detail={true} />);
	expect(forced.container.querySelector(".odp-detail")).not.toBeNull();
});

const REMOVE_CROWN = /Quitar marca en corona/;
const ADD_ROOT = /Agregar marca en raíz/;
const ADD_CROWN = /Agregar marca en corona/;

describe("brush", () => {
	// jsdom has no layout: give the SVG a fixed on-screen box.
	function setup(marks: ToothMark[] = []) {
		const onMarksChange = vi.fn();
		const utils = render(
			<ToothSvg
				fdi={16}
				marks={marks}
				onMarksChange={onMarksChange}
				brushColor="#2563eb"
			/>,
		);
		const svg = utils.container.querySelector("svg") as SVGSVGElement;
		svg.getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
		return { ...utils, svg, onMarksChange };
	}

	it("adds a dot in tooth millimetres with the zone it landed on", () => {
		const { container, onMarksChange } = setup();
		const crown = container.querySelector('[data-zone="crown"]') as Element;
		fireEvent.click(crown, { clientX: 3, clientY: 4 });
		expect(onMarksChange).toHaveBeenCalledWith([
			expect.objectContaining({
				fdi: 16,
				view: "lateral",
				zone: "crown",
				color: "#2563eb",
				geometryVersion: GEOMETRY_VERSION,
			}),
		]);
		const [mark] = onMarksChange.mock.calls[0][0];
		expect(typeof mark.x).toBe("number");
	});

	it("ignores clicks outside the tooth", () => {
		const { svg, onMarksChange } = setup();
		fireEvent.click(svg, { clientX: 0, clientY: 0 });
		expect(onMarksChange).not.toHaveBeenCalled();
	});

	it("does not paint the occlusal circle", () => {
		const onMarksChange = vi.fn();
		const { container, queryAllByRole } = render(
			<ToothSvg fdi={16} view="occlusal" onMarksChange={onMarksChange} />,
		);
		fireEvent.click(container.querySelector('[data-zone="M"]') as Element);
		expect(onMarksChange).not.toHaveBeenCalled();
		expect(queryAllByRole("button")).toHaveLength(0);
	});

	it("draws only its own marks and removes one by click or keyboard", () => {
		const mine: ToothMark = {
			fdi: 16,
			view: "lateral",
			x: 0,
			y: 0,
			zone: "crown",
			geometryVersion: 1,
		};
		const other: ToothMark = { ...mine, fdi: 26 };
		const { getAllByRole, onMarksChange } = setup([mine, other]);
		const dots = getAllByRole("button", { name: REMOVE_CROWN });
		expect(dots).toHaveLength(1);
		fireEvent.click(dots[0]);
		expect(onMarksChange).toHaveBeenLastCalledWith([other]);
		fireEvent.keyDown(dots[0], { key: "Delete" });
		expect(onMarksChange).toHaveBeenLastCalledWith([other]);
	});

	it("adds dots from the keyboard on a focused zone, without stacking them", () => {
		const { getByRole, onMarksChange, rerender } = setup();
		fireEvent.keyDown(getByRole("button", { name: ADD_CROWN }), {
			key: "Enter",
		});
		const [first] = onMarksChange.mock.calls[0][0] as ToothMark[];
		expect(first).toMatchObject({ fdi: 16, view: "lateral", zone: "crown" });

		rerender(
			<ToothSvg fdi={16} marks={[first]} onMarksChange={onMarksChange} />,
		);
		fireEvent.keyDown(getByRole("button", { name: ADD_CROWN }), { key: " " });
		const second = (onMarksChange.mock.calls[1][0] as ToothMark[])[1];
		expect(second.zone).toBe("crown");
		expect([second.x, second.y]).not.toEqual([first.x, first.y]);
	});

	it("puts keyboard dots on crown and root in the lateral view", () => {
		const onMarksChange = vi.fn();
		const { getByRole } = render(
			<ToothSvg fdi={36} onMarksChange={onMarksChange} />,
		);
		fireEvent.keyDown(getByRole("button", { name: ADD_ROOT }), {
			key: "Enter",
		});
		fireEvent.keyDown(getByRole("button", { name: ADD_CROWN }), {
			key: "Enter",
		});
		const [[[root]], [[crown]]] = onMarksChange.mock.calls as ToothMark[][][];
		// Lower tooth: roots point down (+y), crown up (-y).
		expect(root.zone).toBe("root");
		expect(root.y).toBeGreaterThan(0);
		expect(crown.zone).toBe("crown");
		expect(crown.y).toBeLessThan(0);
	});

	it("is read-only without onMarksChange", () => {
		const mark: ToothMark = {
			fdi: 16,
			view: "lateral",
			x: 0,
			y: 2,
			zone: "crown",
			geometryVersion: GEOMETRY_VERSION,
		};
		const { container, queryByRole } = render(
			<ToothSvg fdi={16} marks={[mark]} />,
		);
		expect(container.querySelectorAll(".odp-mark")).toHaveLength(1);
		expect(queryByRole("button")).toBeNull();
	});
});
