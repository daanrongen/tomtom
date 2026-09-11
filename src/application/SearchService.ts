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

export interface BrandSearchOptions {
  readonly brandSet: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly countrySet?: string;
  readonly language?: string;
  readonly lat?: number;
  readonly lon?: number;
  readonly radius?: number;
  readonly categorySet?: string;
}

/**
 * POI search scoped to a brand (spec §8.5). Unlike categorySearch, this uses the brand
 * name itself as the free-text query — TomTom's poiSearch returns zero results for
 * `brandSet` alone under the `*` wildcard (verified live); the wildcard convention only
 * works with `categorySet`.
 */
export const brandSearch = (options: BrandSearchOptions) =>
  poiSearch({ query: options.brandSet, ...options });

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

export interface EvSearchOptions {
  readonly lat?: number;
  readonly lon?: number;
  readonly radius?: number;
  readonly topLeft?: string;
  readonly btmRight?: string;
  readonly connector?: string;
  readonly minPowerKw?: number;
  readonly maxPowerKw?: number;
  readonly status?: string;
  readonly brandSet?: string;
  readonly paymentBrand?: string;
  readonly accessType?: string;
  readonly vehicleType?: string;
  readonly vehicleCategory?: string;
  readonly limit?: number;
}

/** EV charging station search (spec §8.8) — Orbis EV Search API, not the classic Search API's category filter. */
export const evSearch = (options: EvSearchOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get("/maps/orbis/places/ev/nearby", {
      apiVersion: 1,
      lat: options.lat,
      lon: options.lon,
      radius: options.radius,
      topLeft: options.topLeft,
      btmRight: options.btmRight,
      connector: options.connector,
      minPowerKW: options.minPowerKw,
      maxPowerKW: options.maxPowerKw,
      status: options.status,
      brand: options.brandSet,
      paymentBrand: options.paymentBrand,
      accessType: options.accessType,
      vehicleType: options.vehicleType,
      vehicleCategory: options.vehicleCategory,
      limit: options.limit,
    });
  });
