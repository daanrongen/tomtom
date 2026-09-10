import { Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { calculateRoute, reachableRange } from "@/application/RouteService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { render, renderReachableRange, renderRoute } from "@/cli/render.js";
import { withTomTomClient } from "@/cli/runtime.js";
import { notImplemented } from "./stubs.js";

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
        yield* render(parsed, data, renderReachableRange as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("Calculate a time/distance/fuel/energy reachable-range polygon"));

const matrix = notImplemented("matrix", "route matrix", globalOptions);

export const route = Command.make("route", {}, () =>
  Console.log("Usage: tomtom route <calculate|matrix|reachable-range>"),
).pipe(
  Command.withDescription("TomTom Routing API"),
  Command.withSubcommands([calculate, matrix, reachableRangeCommand]),
);
