import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { fuzzySearch, nearbySearch, poiSearch } from "@/application/SearchService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { render, renderSearchResults } from "@/cli/render.js";
import { withTomTomClient } from "@/cli/runtime.js";
import { notImplemented } from "./stubs.js";

const limitOption = Options.integer("limit").pipe(Options.optional);
const offsetOption = Options.integer("offset").pipe(Options.optional);
const countrySetOption = Options.text("country").pipe(Options.optional);
const languageOption = Options.text("language").pipe(Options.optional);
const latOption = Options.float("lat").pipe(Options.optional);
const lonOption = Options.float("lon").pipe(Options.optional);
const radiusOption = Options.integer("radius").pipe(Options.optional);
const topLeftOption = Options.text("top-left").pipe(Options.optional);
const btmRightOption = Options.text("btm-right").pipe(Options.optional);
const categorySetOption = Options.text("category").pipe(Options.optional);
const brandSetOption = Options.text("brand").pipe(Options.optional);
const viewOption = Options.text("view").pipe(Options.optional);
const openingHoursOption = Options.text("opening-hours").pipe(Options.optional);
const typeaheadOption = Options.boolean("typeahead").pipe(Options.withDefault(false));
const entityTypeSetOption = Options.text("entity-type").pipe(Options.optional);
const idxSetOption = Options.text("idx-set").pipe(Options.optional);

const fuzzyOptions = {
  ...globalOptions,
  query: Args.text({ name: "query" }),
  limit: limitOption,
  offset: offsetOption,
  country: countrySetOption,
  language: languageOption,
  lat: latOption,
  lon: lonOption,
  radius: radiusOption,
  topLeft: topLeftOption,
  btmRight: btmRightOption,
  category: categorySetOption,
  brand: brandSetOption,
  view: viewOption,
  openingHours: openingHoursOption,
  typeahead: typeaheadOption,
  entityType: entityTypeSetOption,
  idxSet: idxSetOption,
};

const opt = <A>(value: unknown): A | undefined => Option.getOrUndefined(value as Option.Option<A>);

// biome-ignore lint/suspicious/noExplicitAny: @effect/cli's parsed-config type is unwieldy to hand-annotate here.
const toFuzzyInput = (parsed: any) => ({
  query: parsed.query as string,
  limit: opt<number>(parsed.limit),
  offset: opt<number>(parsed.offset),
  countrySet: opt<string>(parsed.country),
  language: opt<string>(parsed.language),
  lat: opt<number>(parsed.lat),
  lon: opt<number>(parsed.lon),
  radius: opt<number>(parsed.radius),
  topLeft: opt<string>(parsed.topLeft),
  btmRight: opt<string>(parsed.btmRight),
  categorySet: opt<string>(parsed.category),
  brandSet: opt<string>(parsed.brand),
  view: opt<string>(parsed.view),
  openingHours: opt<string>(parsed.openingHours),
  typeahead: parsed.typeahead as boolean,
  entityTypeSet: opt<string>(parsed.entityType),
  idxSet: opt<string>(parsed.idxSet),
});

export const fuzzy = Command.make("fuzzy", fuzzyOptions, (parsed) =>
  withTomTomClient(
    parsed as GlobalFlags,
    Effect.gen(function* () {
      const data = yield* fuzzySearch(toFuzzyInput(parsed));
      yield* render(parsed, data, renderSearchResults as (d: unknown) => string);
    }),
  ),
).pipe(Command.withDescription("Fuzzy free-text search (the default for `tomtom search <query>`)"));

const poi = Command.make("poi", fuzzyOptions, (parsed) =>
  withTomTomClient(
    parsed as GlobalFlags,
    Effect.gen(function* () {
      const data = yield* poiSearch(toFuzzyInput(parsed));
      yield* render(parsed, data, renderSearchResults as (d: unknown) => string);
    }),
  ),
).pipe(Command.withDescription("Search for points of interest"));

const nearby = Command.make(
  "nearby",
  {
    ...globalOptions,
    lat: Options.float("lat"),
    lon: Options.float("lon"),
    radius: radiusOption,
    limit: limitOption,
    offset: offsetOption,
    country: countrySetOption,
    language: languageOption,
    category: categorySetOption,
    brand: brandSetOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const data = yield* nearbySearch({
          lat: parsed.lat,
          lon: parsed.lon,
          radius: Option.getOrUndefined(parsed.radius),
          limit: Option.getOrUndefined(parsed.limit),
          offset: Option.getOrUndefined(parsed.offset),
          countrySet: Option.getOrUndefined(parsed.country),
          language: Option.getOrUndefined(parsed.language),
          categorySet: Option.getOrUndefined(parsed.category),
          brandSet: Option.getOrUndefined(parsed.brand),
        });
        yield* render(parsed, data, renderSearchResults as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("Search near a lat/lon point"));

const category = notImplemented("category", "search category", globalOptions, {
  category: Args.text({ name: "category" }),
});
const brand = notImplemented("brand", "search brand", globalOptions, {
  brand: Args.text({ name: "brand" }),
});
const alongRoute = notImplemented("along-route", "search along-route", globalOptions);
const geometry = notImplemented("geometry", "search geometry", globalOptions);
const ev = notImplemented("ev", "search ev", globalOptions);

/** Names @effect/cli will treat as subcommands of `search` — used by main.ts's bare-query alias rewrite. */
export const SEARCH_SUBCOMMAND_NAMES = [
  "fuzzy",
  "poi",
  "nearby",
  "category",
  "brand",
  "along-route",
  "geometry",
  "ev",
];

export const search = Command.make("search", {}, () =>
  Console.log(
    "Usage: tomtom search <query> | tomtom search <fuzzy|poi|nearby|category|brand|along-route|geometry|ev>",
  ),
).pipe(
  Command.withDescription("Search TomTom's Search API (fuzzy search by default)"),
  Command.withSubcommands([fuzzy, poi, nearby, category, brand, alongRoute, geometry, ev]),
);
