import { fireEvent, render, within } from "@testing-library/react";
import { useState } from "react";
import { type PerioChart, Periodontogram } from "../src";

function Controlled({
	initial = {},
	spy,
}: { initial?: PerioChart; spy?: (v: PerioChart) => void }) {
	const [value, setValue] = useState<PerioChart>(initial);
	return (
		<Periodontogram
			value={value}
			onChange={(v) => {
				setValue(v);
				spy?.(v);
			}}
		/>
	);
}

const PS_11 = /^PS 11 /;
const PS_21 = /^PS 21 /;
const MARGIN_16 = /,-1 .*,-2$/;
const POCKET_16 = /,-5 .*,-7$/;

const typeIn = (el: HTMLElement, text: string) => {
	el.focus();
	fireEvent.change(el, { target: { value: text } });
};

it("has the 6 sites of every permanent tooth for PS and MG", () => {
	const { getAllByRole } = render(<Periodontogram value={{}} />);
	const label = (el: HTMLElement) => el.getAttribute("aria-label") ?? "";
	const inputs = getAllByRole("textbox");
	expect(inputs.filter((el) => label(el).startsWith("PS "))).toHaveLength(
		32 * 6,
	);
	expect(inputs.filter((el) => label(el).startsWith("MG "))).toHaveLength(
		32 * 6,
	);
});

it("orders sites so mesial faces the midline", () => {
	const { getAllByLabelText } = render(<Periodontogram value={{}} />);
	const labels = (re: RegExp) =>
		getAllByLabelText(re).map((el) => el.getAttribute("aria-label"));
	// Patient's right (viewer's left): distal first. Left side: mesial first.
	expect(labels(PS_11)).toEqual([
		"PS 11 DV",
		"PS 11 V",
		"PS 11 MV",
		"PS 11 DL",
		"PS 11 L",
		"PS 11 ML",
	]);
	expect(labels(PS_21)).toEqual([
		"PS 21 MV",
		"PS 21 V",
		"PS 21 DV",
		"PS 21 ML",
		"PS 21 L",
		"PS 21 DL",
	]);
});

it("saves a digit and jumps to the next site", () => {
	const spy = vi.fn();
	const { getByLabelText } = render(<Controlled spy={spy} />);
	typeIn(getByLabelText("PS 18 DV"), "3");
	expect(spy).toHaveBeenLastCalledWith({ 18: { sites: { DV: { pd: 3 } } } });
	expect(document.activeElement).toBe(getByLabelText("PS 18 V"));
});

it("waits after a lone 1 (for 10–19) and after a minus sign", () => {
	const spy = vi.fn();
	const { getByLabelText } = render(<Controlled spy={spy} />);
	const ps = getByLabelText("PS 18 DV");
	typeIn(ps, "1");
	expect(document.activeElement).toBe(ps);
	typeIn(ps, "12");
	expect(spy).toHaveBeenLastCalledWith({ 18: { sites: { DV: { pd: 12 } } } });
	expect(document.activeElement).toBe(getByLabelText("PS 18 V"));

	const gm = getByLabelText("MG 17 DV");
	typeIn(gm, "-");
	expect(document.activeElement).toBe(gm);
	typeIn(gm, "-2");
	expect(spy).toHaveBeenLastCalledWith(
		expect.objectContaining({ 17: { sites: { DV: { gm: -2 } } } }),
	);
});

it("Enter accepts a lone 1 and moves on", () => {
	const { getByLabelText } = render(<Controlled />);
	const ps = getByLabelText("PS 18 DV");
	typeIn(ps, "1");
	fireEvent.keyDown(ps, { key: "Enter" });
	expect(document.activeElement).toBe(getByLabelText("PS 18 V"));
});

it("skips missing teeth when advancing", () => {
	const { getByLabelText } = render(
		<Controlled initial={{ 17: { missing: true } }} />,
	);
	expect(getByLabelText("PS 17 DV")).toBeDisabled();
	typeIn(getByLabelText("PS 18 MV"), "4");
	expect(document.activeElement).toBe(getByLabelText("PS 16 DV"));
});

it("rejects out-of-range values without saving them", () => {
	const spy = vi.fn();
	const { getByLabelText } = render(<Controlled spy={spy} />);
	const ps = getByLabelText("PS 18 DV");
	typeIn(ps, "25");
	expect(spy).not.toHaveBeenCalled();
	expect(ps).toHaveAttribute("aria-invalid", "true");
});

it("toggles bleeding and only offers the tooth's own furcations", () => {
	const spy = vi.fn();
	const { getByLabelText, queryByLabelText } = render(<Controlled spy={spy} />);
	fireEvent.click(getByLabelText("Sangrado 16 MV"));
	expect(spy).toHaveBeenLastCalledWith({
		16: { sites: { MV: { bleeding: true } } },
	});
	expect(getByLabelText("Sangrado 16 MV")).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	expect(getByLabelText("Furca 16 V")).toBeInTheDocument();
	expect(getByLabelText("Furca 16 MP")).toBeInTheDocument();
	expect(getByLabelText("Furca 36 L")).toBeInTheDocument();
	expect(queryByLabelText("Furca 11 V")).toBeNull();
});

it("draws the margin and pocket lines from the data", () => {
	const value: PerioChart = {
		16: { sites: { MV: { pd: 5, gm: 2 }, V: { pd: 4, gm: 1 } } },
	};
	const { container } = render(<Periodontogram value={value} />);
	const margin = container.querySelector(".odp-perio-margin");
	const pocket = container.querySelector(".odp-perio-pocket");
	// Upper tooth: recession and pocket go up (negative y). 16 is on the left: V then MV.
	expect(margin?.getAttribute("points")).toMatch(MARGIN_16);
	expect(pocket?.getAttribute("points")).toMatch(POCKET_16);
});

it("shows the summary indices", () => {
	const value: PerioChart = {
		11: {
			sites: { V: { pd: 4, gm: 1, bleeding: true }, L: { pd: 2, gm: 0 } },
		},
	};
	const { getByLabelText } = render(<Periodontogram value={value} />);
	const summary = within(getByLabelText("Resumen periodontal"));
	expect(summary.getByText("50.0%")).toBeInTheDocument(); // sangrado
	expect(summary.getByText("3.0 mm")).toBeInTheDocument(); // PS media
	expect(summary.getByText("3.5 mm")).toBeInTheDocument(); // NIC media
});

it("is read-only without onChange", () => {
	const { getByLabelText } = render(<Periodontogram value={{}} />);
	expect(getByLabelText("PS 16 MV")).toHaveAttribute("readonly");
	expect(getByLabelText("Sangrado 16 MV")).toBeDisabled();
});
