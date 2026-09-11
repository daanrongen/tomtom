import { Effect } from "effect";
import * as BoundingBox from "@/domain/shared/BoundingBox.js";
import * as Coordinate from "@/domain/shared/Coordinate.js";
import { ValidationError } from "@/domain/shared/errors.js";
import { TomTomClient } from "@/ports/TomTomClient.js";

export interface StaticMapOptions {
  readonly center?: string;
  readonly bbox?: string;
  readonly zoom?: number;
  readonly width?: number;
  readonly height?: number;
  readonly format?: string;
  readonly layer?: string;
  readonly style?: string;
  readonly view?: string;
  readonly language?: string;
}

/** TomTom's `center` param is `lon,lat` — the reverse of this CLI's usual `lat,lon` convention. */
const toCenterParam = (coordinate: Coordinate.Coordinate): string => `${coordinate.lon},${coordinate.lat}`;

/** Static map image rendering (Map Display API `GET /map/1/staticimage`) — returns raw image bytes. */
export const staticImage = (options: StaticMapOptions) =>
  Effect.gen(function* () {
    if ((options.center === undefined) === (options.bbox === undefined)) {
      return yield* Effect.fail(
        new ValidationError({ message: "specify exactly one of --center or --bbox" }),
      );
    }

    const center = options.center ? toCenterParam(yield* Coordinate.parse(options.center)) : undefined;
    const bbox = options.bbox ? BoundingBox.toParam(yield* BoundingBox.parse(options.bbox)) : undefined;

    const client = yield* TomTomClient;
    return yield* client.getBinary("/map/1/staticimage", {
      center,
      bbox,
      zoom: options.zoom,
      width: options.width,
      height: options.height,
      format: options.format,
      layer: options.layer,
      style: options.style,
      view: options.view,
      language: options.language,
    });
  });
