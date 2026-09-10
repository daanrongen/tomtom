import { Either } from "effect";
import { ValidationError } from "./errors.js";

export interface Coordinate {
  readonly lat: number;
  readonly lon: number;
}

export const isValid = (c: Coordinate): boolean =>
  c.lat >= -90 && c.lat <= 90 && c.lon >= -180 && c.lon <= 180;

export const parse = (input: string): Either.Either<Coordinate, ValidationError> => {
  const parts = input.split(",").map((p) => p.trim());
  if (parts.length !== 2) {
    return Either.left(
      new ValidationError({
        message: `"${input}" is not a valid "lat,lon" coordinate`,
      }),
    );
  }
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return Either.left(
      new ValidationError({
        message: `"${input}" is not a valid "lat,lon" coordinate`,
      }),
    );
  }
  const coordinate = { lat, lon };
  if (!isValid(coordinate)) {
    return Either.left(
      new ValidationError({
        message: `"${input}" is out of range (lat must be -90..90, lon -180..180)`,
      }),
    );
  }
  return Either.right(coordinate);
};

export const toParam = (c: Coordinate): string => `${c.lat},${c.lon}`;
