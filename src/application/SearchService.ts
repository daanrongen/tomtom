import { Effect } from "effect";
import { TomTomClient } from "@/ports/TomTomClient.js";

export interface FuzzySearchOptions {
  readonly query: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly countrySet?: string;
  readonly language?: string;
  readonly lat?: number;
  readonly lon?: number;
  readonly radius?: number;
  readonly topLeft?: string;
  readonly btmRight?: string;
  readonly categorySet?: string;
  readonly brandSet?: string;
  readonly view?: string;
  readonly openingHours?: string;
  readonly typeahead?: boolean;
  readonly entityTypeSet?: string;
  readonly idxSet?: string;
}

const searchParams = (options: FuzzySearchOptions) => ({
  limit: options.limit,
  ofs: options.offset,
  countrySet: options.countrySet,
  language: options.language,
  lat: options.lat,
  lon: options.lon,
  radius: options.radius,
  topLeft: options.topLeft,
  btmRight: options.btmRight,
  categorySet: options.categorySet,
  brandSet: options.brandSet,
  view: options.view,
  openingHours: options.openingHours,
  typeahead: options.typeahead,
  entityTypeSet: options.entityTypeSet,
  idxSet: options.idxSet,
});

export const fuzzySearch = (options: FuzzySearchOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get(
      `/search/2/search/${encodeURIComponent(options.query)}.json`,
      searchParams(options),
    );
  });

export const poiSearch = (options: FuzzySearchOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get(
      `/search/2/poiSearch/${encodeURIComponent(options.query)}.json`,
      searchParams(options),
    );
  });

export interface CategorySearchOptions {
  readonly categorySet: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly countrySet?: string;
  readonly language?: string;
  readonly lat?: number;
  readonly lon?: number;
  readonly radius?: number;
  readonly brandSet?: string;
}

/** POI search scoped to a category, via poiSearch's wildcard-query convention (spec §8.4). */
export const categorySearch = (options: CategorySearchOptions) => poiSearch({ query: "*", ...options });

export interface NearbySearchOptions {
  readonly lat: number;
  readonly lon: number;
  readonly radius?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly countrySet?: string;
  readonly language?: string;
  readonly categorySet?: string;
  readonly brandSet?: string;
}

export const nearbySearch = (options: NearbySearchOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get("/search/2/nearbySearch/.json", {
      lat: options.lat,
      lon: options.lon,
      radius: options.radius,
      limit: options.limit,
      ofs: options.offset,
      countrySet: options.countrySet,
      language: options.language,
      categorySet: options.categorySet,
      brandSet: options.brandSet,
    });
  });
