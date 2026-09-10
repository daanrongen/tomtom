import { describe, expect, test } from "bun:test";
import { Either } from "effect";
import * as BoundingBox from "@/domain/shared/BoundingBox.js";

describe("BoundingBox.parse", () => {
  test("parses a valid box", () => {
    const result = BoundingBox.parse("-0.2,51.45,-0.05,51.55");
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({
        minLon: -0.2,
        minLat: 51.45,
        maxLon: -0.05,
        maxLat: 51.55,
      });
    }
  });

  test("rejects wrong number of parts", () => {
    expect(Either.isLeft(BoundingBox.parse("1,2,3"))).toBe(true);
  });

  test("rejects non-numeric parts", () => {
    expect(Either.isLeft(BoundingBox.parse("a,b,c,d"))).toBe(true);
  });

  test("rejects min >= max", () => {
    expect(Either.isLeft(BoundingBox.parse("1,1,0,0"))).toBe(true);
  });

  test("toParam round-trips", () => {
    expect(
      BoundingBox.toParam({
        minLon: -0.2,
        minLat: 51.45,
        maxLon: -0.05,
        maxLat: 51.55,
      }),
    ).toBe("-0.2,51.45,-0.05,51.55");
  });
});
