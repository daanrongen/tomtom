import { describe, expect, test } from "bun:test";
import { applySelect } from "@/cli/select.js";

describe("applySelect", () => {
  const data = { results: [{ position: { lat: 1, lon: 2 } }, { position: { lat: 3, lon: 4 } }] };

  test("plain field", () => {
    expect(applySelect("results", data)).toEqual(data.results);
  });

  test("dotted path with numeric index", () => {
    expect(applySelect("results.0.position", data)).toEqual({ lat: 1, lon: 2 });
  });

  test("bracket index", () => {
    expect(applySelect("results[1].position", data)).toEqual({ lat: 3, lon: 4 });
  });

  test("map-over-array with []", () => {
    expect(applySelect("results[].position", data)).toEqual([
      { lat: 1, lon: 2 },
      { lat: 3, lon: 4 },
    ]);
  });

  test("missing path returns undefined", () => {
    expect(applySelect("results[].bogus", data)).toEqual([undefined, undefined]);
    expect(applySelect("nope.field", data)).toBeUndefined();
  });
});
