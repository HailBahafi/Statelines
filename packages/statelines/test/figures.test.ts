import { describe, expect, it } from "vitest";
import * as figures from "../src/figures";
import { FIGURE_STATES } from "../src/core/types";
import { Runner } from "../src/core/runner";
import { renderToString } from "../src/core/static";
import type { Figure } from "../src/core/types";

const all = Object.entries(figures) as [string, Figure<any>][];

describe("every figure", () => {
  it("ships every figure with a unique name", () => {
    expect(all.length).toBe(100);
    expect(new Set(all.map(([, f]) => f.definition.name)).size).toBe(100);
  });

  for (const [key, figure] of all) {
    describe(key, () => {
      for (const state of FIGURE_STATES) {
        it(`draws "${state}" without NaN`, () => {
          const html = renderToString(figure, { state });
          expect(html).toMatch(/<(polygon|path)/);
          expect(html).not.toMatch(/NaN|undefined|Infinity/);
        });
      }

      it("comes to rest when idle and untouched", () => {
        const runner = new Runner(figure.definition);
        let active = true;
        for (let i = 0; i < 300 && active; i++) active = runner.frame(1 / 60).active;
        expect(active).toBe(false);
      });

      it("keeps moving while loading", () => {
        const runner = new Runner(figure.definition);
        runner.setState("loading");
        let frame = runner.frame(1 / 60);
        for (let i = 0; i < 120; i++) frame = runner.frame(1 / 60);
        expect(frame.active).toBe(true);
      });

      it("answers the pointer", () => {
        const settle = (point?: [number, number]) => {
          const runner = new Runner(figure.definition);
          if (point) runner.pointerMove(...point);
          let markup = "";
          for (let i = 0; i < 60; i++) markup = runner.frame(1 / 60).markup;
          return markup;
        };
        const still = settle();
        const points: [number, number][] = [[-40, -20], [0, 0], [40, 10], [80, 20]];
        expect(points.some(p => settle(p) !== still)).toBe(true);
      });
    });
  }
});
