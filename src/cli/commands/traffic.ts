import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";
import { incidentDetails, incidents } from "@/application/TrafficService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { render, renderIncidents } from "@/cli/render.js";
import { withTomTomClient } from "@/cli/runtime.js";
import * as BoundingBox from "@/domain/shared/BoundingBox.js";
import { notImplemented } from "./stubs.js";

const languageOption = Options.text("language").pipe(Options.optional);
const categoryOption = Options.text("category").pipe(
  Options.optional,
  Options.withDescription("Numeric (0-14) or descriptive (e.g. Accident, Jam), comma-separated"),
);
const timeValidityOption = Options.text("time-window").pipe(
  Options.optional,
  Options.withDescription("present | future, comma-separated"),
);

const incidentsCommand = Command.make(
  "incidents",
  {
    ...globalOptions,
    bbox: Options.text("bbox").pipe(Options.withDescription("minLon,minLat,maxLon,maxLat")),
    language: languageOption,
    category: categoryOption,
    timeWindow: timeValidityOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const bbox = yield* BoundingBox.parse(parsed.bbox);
        const data = yield* incidents({
          bbox: BoundingBox.toParam(bbox),
          language: Option.getOrUndefined(parsed.language),
          category: Option.getOrUndefined(parsed.category),
          timeValidityFilter: Option.getOrUndefined(parsed.timeWindow),
        });
        yield* render(parsed, data, renderIncidents as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("List traffic incidents inside a bounding box"));

const details = Command.make(
  "details",
  {
    ...globalOptions,
    id: Args.text({ name: "incident-id" }),
    language: languageOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const data = yield* incidentDetails(parsed.id, {
          language: Option.getOrUndefined(parsed.language),
        });
        yield* render(parsed, data, renderIncidents as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("Look up a single traffic incident by ID"));

const flow = notImplemented("flow", "traffic flow", globalOptions);

export const traffic = Command.make("traffic", {}, () =>
  Console.log("Usage: tomtom traffic <incidents|details|flow>"),
).pipe(
  Command.withDescription("TomTom Traffic API"),
  Command.withSubcommands([incidentsCommand, details, flow]),
);
