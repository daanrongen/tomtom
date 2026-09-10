import { Effect } from "effect";
import { TomTomClient } from "@/ports/TomTomClient.js";

export interface GeocodeOptions {
  readonly query: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly countrySet?: string;
  readonly language?: string;
  readonly lat?: number;
  readonly lon?: number;
  readonly radius?: number;
  readonly view?: string;
  readonly entityTypeSet?: string;
}

export const geocode = (options: GeocodeOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get(`/search/2/geocode/${encodeURIComponent(options.query)}.json`, {
      limit: options.limit,
      ofs: options.offset,
      countrySet: options.countrySet,
      language: options.language,
      lat: options.lat,
      lon: options.lon,
      radius: options.radius,
      view: options.view,
      entityTypeSet: options.entityTypeSet,
    });
  });

export interface ReverseGeocodeOptions {
  readonly lat: number;
  readonly lon: number;
  readonly language?: string;
  readonly radius?: number;
  readonly returnSpeedLimit?: boolean;
  readonly heading?: number;
  readonly view?: string;
}

export const reverseGeocode = (options: ReverseGeocodeOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get(`/search/2/reverseGeocode/${options.lat},${options.lon}.json`, {
      language: options.language,
      radius: options.radius,
      returnSpeedLimit: options.returnSpeedLimit,
      heading: options.heading,
      view: options.view,
    });
  });

/** Shape used internally to pull a position out of a geocode response for route waypoint resolution. */
export interface GeocodeResponseShape {
  readonly results?: ReadonlyArray<{
    readonly position?: { readonly lat: number; readonly lon: number };
  }>;
}
