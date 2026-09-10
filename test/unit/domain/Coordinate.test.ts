import { describe, expect, test } from "bun:test";
import { Either } from "effect";
import * as Coordinate from "@/domain/shared/Coordinate.js";

describe("Coordinate.parse", () => {
  test("parses a valid lat,lon pair", () => {
    const result = Coordinate.parse("51.5074,-0.1278");
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({ lat: 51.5074, lon: -0.1278 });
    }
  });

  test("rejects malformed input", () => {
    const result = Coordinate.parse("not-a-coordinate");
    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects out-of-range latitude", () => {
    const result = Coordinate.parse("120,0");
    expect(Either.isLeft(result)).toBe(true);
  });

  test("rejects out-of-range longitude", () => {
    const result = Coordinate.parse("0,200");
    expect(Either.isLeft(result)).toBe(true);
  });

  test("toParam round-trips", () => {
    expect(Coordinate.toParam({ lat: 51.5, lon: -0.1 })).toBe("51.5,-0.1");
  });
});
