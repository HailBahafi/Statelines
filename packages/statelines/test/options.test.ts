import { describe, expect, it } from "vitest";
import * as figures from "../src/figures";
import { renderToString } from "../src/core/static";
import { FIGURE_STATES, type Figure } from "../src/core/types";

const all = Object.entries(figures) as [string, Figure<any>][];

import { PROGRESS, COUNT } from "./lists";

describe("progress", () => {
  for (const key of PROGRESS) {
    it(`${key} draws the progress it is given`, () => {
      const figure = figures[key] as Figure<any>;
      const low = renderToString(figure, { state: "loading", progress: 0.15 });
      const high = renderToString(figure, { state: "loading", progress: 0.85 });
      expect(low).not.toBe(high);
    });
  }
});

describe("count", () => {
  for (const key of COUNT) {
    it(`${key} changes with count`, () => {
      const figure = figures[key] as Figure<any>;
      expect(renderToString(figure, { state: "success", count: 2 })).not.toBe(renderToString(figure, { state: "success", count: 8 }));
    });
  }

  for (const [key, figure] of all) {
    it(`${key} survives any count`, () => {
      for (const count of [-5, 0, 1, 3, 100, Number.NaN]) {
        for (const state of FIGURE_STATES) {
          expect(renderToString(figure, { state, count })).not.toMatch(/NaN|undefined|Infinity/);
        }
      }
    });
  }
});

describe("styling options", () => {
  it("drops the verdict marks when marks is false", () => {
    const withMarks = renderToString(figures.upload, { state: "success" });
    const without = renderToString(figures.upload, { state: "success", marks: false });
    expect(without.length).toBeLessThan(withMarks.length);
  });

  it("writes per-figure colours and stroke as custom properties", () => {
    const html = renderToString(figures.pay, { colors: { ok: "#0a0", hi: "rebeccapurple" }, stroke: 1.5 });
    expect(html).toContain("--statelines-ok:#0a0");
    expect(html).toContain("--statelines-hi:rebeccapurple");
    expect(html).toContain("--statelines-stroke:1.5");
  });

  it("escapes colour values", () => {
    expect(renderToString(figures.pay, { colors: { ok: '"><script>' } })).not.toContain("<script>");
  });
});
