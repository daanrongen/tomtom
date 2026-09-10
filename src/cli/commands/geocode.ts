import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";
import {
  geocode as geocodeUseCase,
  reverseGeocode as reverseGeocodeUseCase,
} from "@/application/GeocodeService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import {
  render,
  renderGeocodeResults,
  renderReverseGeocodeResults,
} from "@/cli/render.js";
import { withTomTomClient } from "@/cli/runtime.js";
import * as Coordinate from "@/domain/shared/Coordinate.js";

const countrySetOption = Options.text("country").pipe(
  Options.optional,
  Options.withAlias("countrySet"),
  Options.withDescription(
    "Comma-separated ISO country codes to bias/restrict results, e.g. GB,FR",
  ),
);
const languageOption = Options.text("language").pipe(Options.optional);
const limitOption = Options.integer("limit").pipe(Options.optional);
const entityTypeSetOption = Options.text("entity-type").pipe(Options.optional);
const latOption = Options.float("lat").pipe(Options.optional);
const lonOption = Options.float("lon").pipe(Options.optional);
const radiusOption = Options.integer("radius").pipe(Options.optional);
const viewOption = Options.text("view").pipe(Options.optional);

export const geocodeCommand = Command.make(
  "geocode",
  {
    ...globalOptions,
    query: Args.text({ name: "query" }),
    country: countrySetOption,
    language: languageOption,
    limit: limitOption,
    entityType: entityTypeSetOption,
    lat: latOption,
    lon: lonOption,
    radius: radiusOption,
    view: viewOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const data = yield* geocodeUseCase({
          query: parsed.query,
          countrySet: Option.getOrUndefined(parsed.country),
          language: Option.getOrUndefined(parsed.language),
          limit: Option.getOrUndefined(parsed.limit),
          entityTypeSet: Option.getOrUndefined(parsed.entityType),
          lat: Option.getOrUndefined(parsed.lat),
          lon: Option.getOrUndefined(parsed.lon),
          radius: Option.getOrUndefined(parsed.radius),
          view: Option.getOrUndefined(parsed.view),
        });
        yield* render(
          parsed,
          data,
          renderGeocodeResults as (d: unknown) => string,
        );
      }),
    ),
).pipe(Command.withDescription("Forward geocode a free-text address or place"));

const headingOption = Options.float("heading").pipe(Options.optional);
const returnSpeedLimitOption = Options.boolean("return-speed-limit").pipe(
  Options.withDefault(false),
);

export const reverseGeocodeCommand = Command.make(
  "reverse-geocode",
  {
    ...globalOptions,
    position: Args.text({ name: "lat,lon" }),
    language: languageOption,
    radius: radiusOption,
    heading: headingOption,
    returnSpeedLimit: returnSpeedLimitOption,
    view: viewOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const coordinate = yield* Coordinate.parse(parsed.position);
        const data = yield* reverseGeocodeUseCase({
          lat: coordinate.lat,
          lon: coordinate.lon,
          language: Option.getOrUndefined(parsed.language),
          radius: Option.getOrUndefined(parsed.radius),
          heading: Option.getOrUndefined(parsed.heading),
          returnSpeedLimit: parsed.returnSpeedLimit,
          view: Option.getOrUndefined(parsed.view),
        });
        yield* render(
          parsed,
          data,
          renderReverseGeocodeResults as (d: unknown) => string,
        );
      }),
    ),
).pipe(Command.withDescription('Reverse geocode a "lat,lon" coordinate'));
