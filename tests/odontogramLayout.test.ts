import {
	type ChartDentition,
	type Rect,
	getToothGeometry,
	layoutOdontogram,
} from "../src";

const inside = (r: Rect, w: number, h: number) =>
	r.x >= 0 && r.y >= 0 && r.x + r.width <= w && r.y + r.height <= h;

const overlap = (a: Rect, b: Rect) =>
	a.x < b.x + b.width &&
	b.x < a.x + a.width &&
	a.y < b.y + b.height &&
	b.y < a.y + a.height;

describe.each([
	["permanent", 32],
	["primary", 20],
	["mixed", 52],
] as [ChartDentition, number][])("%s chart", (dentition, count) => {
	const layout = layoutOdontogram(dentition);
	const byFdi = new Map(layout.teeth.map((t) => [t.fdi, t]));

	it(`has the ${count} teeth`, () => {
		expect(layout.teeth).toHaveLength(count);
	});

	it("keeps every part inside the chart", () => {
		for (const t of layout.teeth) {
			for (const r of [t.lateral, t.occlusal, t.box]) {
				expect(inside(r, layout.width, layout.height)).toBe(true);
			}
		}
	});

	it("puts the upper arch above the occlusal plane and the lower below", () => {
		for (const t of layout.teeth) {
			const upper = [1, 2, 5, 6].includes(Math.floor(t.fdi / 10));
			for (const r of [t.lateral, t.occlusal]) {
				if (upper) {
					expect(r.y + r.height).toBeLessThanOrEqual(layout.occlusalPlaneY);
				} else {
					expect(r.y).toBeGreaterThanOrEqual(layout.occlusalPlaneY);
				}
			}
		}
	});

	it("puts the patient's right on the viewer's left of the midline", () => {
		for (const t of layout.teeth) {
			const right = [1, 4, 5, 8].includes(Math.floor(t.fdi / 10));
			expect(t.x < layout.midlineX).toBe(right);
		}
	});

	it("never overlaps two drawings", () => {
		const rects = layout.teeth.flatMap((t) => [t.lateral, t.occlusal, t.box]);
		rects.forEach((a, i) => {
			for (const b of rects.slice(i + 1)) {
				expect(overlap(a, b)).toBe(false);
			}
		});
	});

	it("aligns the CEJ of each arch group on one line", () => {
		const cejY = new Map<string, Set<number>>();
		for (const t of byFdi.values()) {
			const g = getToothGeometry(t.fdi);
			// CEJ is y = 0 in tooth space, so in the chart it is rect.y - viewBox.y.
			const key = `${g.dentition}-${g.arch}`;
			const set = cejY.get(key) ?? new Set();
			set.add(Math.round((t.lateral.y - g.lateral.viewBox.y) * 1e6));
			cejY.set(key, set);
		}
		for (const set of cejY.values()) {
			expect(set.size).toBe(1);
		}
	});
});

it("puts primary teeth under their permanent successors", () => {
	const mixed = layoutOdontogram("mixed");
	const x = (fdi: number) => mixed.teeth.find((t) => t.fdi === fdi)?.x;
	expect(x(55)).toBe(x(15));
	expect(x(61)).toBe(x(21));
	expect(x(75)).toBe(x(35));
	expect(x(81)).toBe(x(41));
});

it("narrows the primary-only chart to 10 columns", () => {
	expect(layoutOdontogram("primary").width).toBeLessThan(
		layoutOdontogram("permanent").width,
	);
});
