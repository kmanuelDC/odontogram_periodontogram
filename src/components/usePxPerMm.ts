import { type RefObject, useEffect, useState } from "react";

/** On-screen pixels per chart millimetre, kept up to date on resize. */
export function usePxPerMm(
	ref: RefObject<SVGSVGElement | null>,
	widthMm: number,
) {
	const [px, setPx] = useState(4);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof ResizeObserver === "undefined") {
			return;
		}
		const measure = () =>
			// Half-pixel steps: avoids re-rendering on every resize frame.
			setPx(Math.round((el.getBoundingClientRect().width / widthMm) * 2) / 2);
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		measure();
		return () => ro.disconnect();
	}, [ref, widthMm]);
	return px;
}
