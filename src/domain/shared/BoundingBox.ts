import { Either } from "effect";
import { ValidationError } from "./errors.js";

/** minLon,minLat,maxLon,maxLat — the order TomTom's traffic and geometry-search APIs expect. */
export interface BoundingBox {
  readonly minLon: number;
  readonly minLat: number;
  readonly maxLon: number;
  readonly maxLat: number;
}

export const parse = (input: string): Either.Either<BoundingBox, ValidationError> => {
  const parts = input.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    return Either.left(
      new ValidationError({
        message: `"${input}" is not a valid bounding box (expected "minLon,minLat,maxLon,maxLat")`,
      }),
    );
  }
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if (minLon >= maxLon || minLat >= maxLat) {
    return Either.left(
      new ValidationError({
        message: `"${input}" has min >= max — check the corner order`,
      }),
    );
  }
  return Either.right({ minLon, minLat, maxLon, maxLat });
};

export const toParam = (b: BoundingBox): string => `${b.minLon},${b.minLat},${b.maxLon},${b.maxLat}`;
