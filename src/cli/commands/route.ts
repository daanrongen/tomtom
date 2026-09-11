import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { calculateRoute, reachableRange, routeMatrix } from "@/application/RouteService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import {
  reachableRangeToGeoJson,
  render,
  renderReachableRange,
  renderRoute,
  renderRouteMatrix,
} from "@/cli/render.js";
import { withTomTomClient } from "@/cli/runtime.js";
import { ValidationError } from "@/domain/shared/errors.js";

const fromOption = Options.text("from").pipe(Options.withDescription('Origin: place name or "lat,lon"'));
const toOption = Options.text("to").pipe(Options.withDescription('Destination: place name or "lat,lon"'));
const viaOption = Options.text("via").pipe(
  Options.atLeast(0),
  Options.withDescription("Intermediate waypoint; repeat for multiple stops"),
);
const avoidOption = Options.text("avoid").pipe(
  Options.atLeast(0),
  Options.withDescription("tolls | highways | ferries | unpaved-roads; repeat to combine"),
);
const routeTypeOption = Options.text("route-type").pipe(Options.optional);
const travelModeOption = Options.text("travel-mode").pipe(Options.optional);
const trafficOption = Options.boolean("traffic").pipe(Options.optional);
const departAtOption = Options.text("depart-at").pipe(Options.optional);
const arriveAtOption = Options.text("arrive-at").pipe(Options.optional);
const maxAlternativesOption = Options.integer("alternatives").pipe(Options.optional);
const instructionsOption = Options.choice("instructions", ["none", "coded", "tagged"] as const).pipe(
  Options.optional,
);
const languageOption = Options.text("language").pipe(Options.optional);
const computeBestOrderOption = Options.boolean("compute-best-order").pipe(Options.optional);
const routeRepresentationOption = Options.text("route-representation").pipe(Options.optional);
const sectionTypeOption = Options.text("section-type").pipe(Options.optional);

const calculate = Command.make(
  "calculate",
  {
    ...globalOptions,
    from: fromOption,
    via: viaOption,
    to: toOption,
    avoid: avoidOption,
    routeType: routeTypeOption,
    travelMode: travelModeOption,
    traffic: trafficOption,
    departAt: departAtOption,
    arriveAt: arriveAtOption,
    alternatives: maxAlternativesOption,
    instructions: instructionsOption,
    language: languageOption,
    computeBestOrder: computeBestOrderOption,
    routeRepresentation: routeRepresentationOption,
    sectionType: sectionTypeOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const data = yield* calculateRoute({
          from: parsed.from,
          via: parsed.via,
          to: parsed.to,
          routeType: Option.getOrUndefined(parsed.routeType),
          traffic: Option.getOrUndefined(parsed.traffic),
          travelMode: Option.getOrUndefined(parsed.travelMode),
          avoid: parsed.avoid,
          departAt: Option.getOrUndefined(parsed.departAt),
          arriveAt: Option.getOrUndefined(parsed.arriveAt),
          maxAlternatives: Option.getOrUndefined(parsed.alternatives),
          instructionsType: Option.getOrUndefined(parsed.instructions),
          language: Option.getOrUndefined(parsed.language),
          computeBestOrder: Option.getOrUndefined(parsed.computeBestOrder),
          routeRepresentation: Option.getOrUndefined(parsed.routeRepresentation),
          sectionType: Option.getOrUndefined(parsed.sectionType),
        });
        yield* render(parsed, data, renderRoute as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("Calculate a route between two or more points"));

const reachableRangeCommand = Command.make(
  "reachable-range",
  {
    ...globalOptions,
    from: fromOption,
    time: Options.integer("time").pipe(Options.optional, Options.withDescription("Time budget in seconds")),
    distance: Options.integer("distance").pipe(
      Options.optional,
      Options.withDescription("Distance budget in meters"),
    ),
    fuel: Options.float("fuel").pipe(Options.optional, Options.withDescription("Fuel budget in liters")),
    energy: Options.float("energy").pipe(Options.optional, Options.withDescription("Energy budget in kWh")),
    travelMode: travelModeOption,
    traffic: trafficOption,
    departAt: departAtOption,
    routeType: routeTypeOption,
    avoid: avoidOption,
    geojson: Options.boolean("geojson").pipe(
      Options.withDefault(false),
      Options.withDescription(
        "Output the boundary as a GeoJSON Polygon Feature instead of TomTom's raw shape",
      ),
    ),
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const data = yield* reachableRange({
          from: parsed.from,
          timeBudgetInSec: Option.getOrUndefined(parsed.time),
          distanceBudgetInMeters: Option.getOrUndefined(parsed.distance),
          fuelBudgetInLiters: Option.getOrUndefined(parsed.fuel),
          energyBudgetInkWh: Option.getOrUndefined(parsed.energy),
          travelMode: Option.getOrUndefined(parsed.travelMode),
          traffic: Option.getOrUndefined(parsed.traffic),
          departAt: Option.getOrUndefined(parsed.departAt),
          routeType: Option.getOrUndefined(parsed.routeType),
          avoid: parsed.avoid,
        });
        if (parsed.geojson) {
          const geo = (reachableRangeToGeoJson as (d: unknown) => unknown)(data);
          yield* render(parsed, geo, (d) => JSON.stringify(d));
        } else {
          yield* render(parsed, data, renderReachableRange as (d: unknown) => string);
        }
      }),
    ),
).pipe(Command.withDescription("Calculate a time/distance/fuel/energy reachable-range polygon"));

interface MatrixPoint {
  readonly lat: number;
  readonly lon: number;
}
type MatrixEntry = string | MatrixPoint;
interface MatrixInput {
  readonly origins: ReadonlyArray<MatrixEntry>;
  readonly destinations: ReadonlyArray<MatrixEntry>;
}

const toWaypointString = (entry: MatrixEntry): string =>
  typeof entry === "string" ? entry : `${entry.lat},${entry.lon}`;

const isMatrixEntry = (value: unknown): value is MatrixEntry =>
  typeof value === "string" ||
  (typeof value === "object" &&
    value !== null &&
    typeof (value as MatrixPoint).lat === "number" &&
    typeof (value as MatrixPoint).lon === "number");

const parseMatrixInput = (raw: string, path: string) =>
  Effect.try({
    try: () => JSON.parse(raw) as unknown,
    catch: () => new ValidationError({ message: `${path} is not valid JSON` }),
  }).pipe(
    Effect.flatMap((parsed) => {
      const origins = (parsed as Partial<MatrixInput>)?.origins;
      const destinations = (parsed as Partial<MatrixInput>)?.destinations;
      const valid =
        Array.isArray(origins) &&
        Array.isArray(destinations) &&
        origins.every(isMatrixEntry) &&
        destinations.every(isMatrixEntry);
      if (!valid) {
        return Effect.fail(
          new ValidationError({
            message: `${path} must be {"origins": [...], "destinations": [...]}, entries as "lat,lon", a place name, or {"lat":..,"lon":..}`,
          }),
        );
      }
      return Effect.succeed({ origins, destinations } as MatrixInput);
    }),
  );

const matrix = Command.make(
  "matrix",
  { ...globalOptions, input: Options.text("input").pipe(Options.withDescription("Path to a JSON file")) },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const raw = yield* fs
          .readFileString(parsed.input)
          .pipe(Effect.mapError(() => new ValidationError({ message: `could not read ${parsed.input}` })));
        const input = yield* parseMatrixInput(raw, parsed.input);
        const data = yield* routeMatrix({
          origins: input.origins.map(toWaypointString),
          destinations: input.destinations.map(toWaypointString),
        });
        yield* render(parsed, data, renderRouteMatrix as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("Batch routing across many origins × destinations from a JSON file"));

export const route = Command.make("route", {}, () =>
  Console.log("Usage: tomtom route <calculate|matrix|reachable-range>"),
).pipe(
  Command.withDescription("TomTom Routing API"),
  Command.withSubcommands([calculate, matrix, reachableRangeCommand]),
);
