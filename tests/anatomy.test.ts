import {
	ALL_FDI,
	type Pt,
	SURFACES,
	getToothGeometry,
	isValidFdi,
} from "../src";

const CLOSED_PATH = /^M.*Z$/;

const area = (pts: readonly Pt[]) =>
	Math.abs(
		pts.reduce((sum, [x, y], i) => {
			const [nx, ny] = pts[(i + 1) % pts.length];
			return sum + x * ny - nx * y;
		}, 0),
	) / 2;

const centroidX = (pts: readonly Pt[]) =>
	pts.reduce((s, p) => s + p[0], 0) / pts.length;

describe("FDI", () => {
	it("has the 52 teeth", () => {
		expect(ALL_FDI).toHaveLength(52);
		expect(ALL_FDI.filter((f) => f > 50)).toHaveLength(20);
	});

	it.each([0, 10, 19, 49, 56, 86, 91, 11.5])("rejects %s", (fdi) => {
		expect(isValidFdi(fdi)).toBe(false);
		expect(() => getToothGeometry(fdi)).toThrow(RangeError);
	});
});

describe.each(ALL_FDI)("tooth %i", (fdi) => {
	const g = getToothGeometry(fdi);

	it("has both views", () => {
		expect(g.lateral.crown).toMatch(CLOSED_PATH);
		expect(g.lateral.roots).toMatch(CLOSED_PATH);
		expect(g.lateral.viewBox.width).toBeGreaterThan(0);
		expect(g.occlusal.viewBox.height).toBeGreaterThan(0);
	});

	it("occlusal surfaces tile the outline with no gaps", () => {
		const total = SURFACES.reduce(
			(s, k) => s + area(g.occlusal.surfaces[k]),
			0,
		);
		expect(total).toBeCloseTo(area(g.occlusal.outline), 6);
		for (const s of SURFACES) {
			expect(area(g.occlusal.surfaces[s])).toBeGreaterThan(0);
		}
	});

	it("puts mesial toward the midline and roots away from the occlusal plane", () => {
		const mesialToRight = !g.mirrored;
		expect(centroidX(g.occlusal.surfaces.M) > 0).toBe(mesialToRight);
		expect(centroidX(g.occlusal.surfaces.D) < 0).toBe(mesialToRight);
		expect(g.lateral.apexY < 0).toBe(g.arch === "upper");
		expect(g.lateral.edgeY > 0).toBe(g.arch === "upper");
	});

	it("puts vestibular toward the outside of the arch", () => {
		const vy = g.occlusal.surfaces.V.reduce((s, p) => s + p[1], 0);
		expect(vy < 0).toBe(g.arch === "upper");
	});
});

describe("roots", () => {
	it.each([
		[11, 1],
		[13, 1],
		[14, 2],
		[24, 2],
		[15, 1],
		[16, 3],
		[27, 3],
		[36, 2],
		[48, 2],
		[44, 1],
		[54, 3],
		[65, 3],
		[74, 2],
		[85, 2],
		[53, 1],
	])("tooth %i has %i root(s)", (fdi, count) => {
		expect(getToothGeometry(fdi).rootCount).toBe(count);
		expect(getToothGeometry(fdi).lateral.rootAxes).toHaveLength(count);
	});

	it("primary teeth are smaller than their permanent successors", () => {
		expect(getToothGeometry(51).lateral.viewBox.height).toBeLessThan(
			getToothGeometry(11).lateral.viewBox.height,
		);
	});
});

it("draws the occlusal circle in only two sizes: anterior and posterior", () => {
	const size = (fdi: number) => getToothGeometry(fdi).occlusal.viewBox.width;
	expect(new Set(ALL_FDI.map(size)).size).toBe(2);
	expect(size(11)).toBe(size(53)); // incisor = primary canine
	expect(size(16)).toBe(size(85)); // permanent molar = primary molar
	expect(size(14)).toBeGreaterThan(size(13));
});
