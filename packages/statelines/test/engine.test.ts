import { describe, expect, it } from "vitest";
import { Spring } from "../src/engine/spring";
import { Scene } from "../src/engine/scene";
import { pointAlong, sliceAlong } from "../src/engine/path";
import { nearestAngle, TAU } from "../src/engine/math";

describe("Spring", () => {
  it("settles exactly on its target and reports rest", () => {
    const s = new Spring(0).to(10);
    for (let i = 0; i < 240 && !s.resting; i++) s.step(1 / 60);
    expect(s.resting).toBe(true);
    expect(s.value).toBe(10);
  });

  it("stays stable with a long frame", () => {
    const s = new Spring(0, 260, 22).to(1);
    s.step(1 / 20);
    expect(Number.isFinite(s.value)).toBe(true);
    expect(Math.abs(s.value)).toBeLessThan(2);
  });
});

describe("Scene", () => {
  it("projects the origin to the centre and z upward", () => {
    const scene = new Scene();
    expect(scene.point(0, 0, 0)).toBe("0,0");
    expect(scene.point(0, 0, 10)).toBe("0,-10");
  });

  it("skips invisible shapes", () => {
    expect(new Scene().box(0, 0, 0, 10, 10, 10, "base", 0).toString()).toBe("");
  });
});

describe("paths", () => {
  const route = [[0, 0], [10, 0], [10, 10]] as const;
  it("walks by length", () => {
    expect(pointAlong(route, 0.5)).toEqual([10, 0]);
    expect(pointAlong(route, 0.75)).toEqual([10, 5]);
  });
  it("slices up to a fraction", () => {
    expect(sliceAlong(route, 0.25)).toEqual([[0, 0], [5, 0]]);
  });
});

it("picks the nearest equivalent angle", () => {
  expect(nearestAngle(0.1, TAU * 3)).toBeCloseTo(TAU * 3 + 0.1);
});
