import { Args, Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { flowSegment, flowTile, incidentDetails, incidents } from "@/application/TrafficService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { render, renderFlowSegment, renderIncidents } from "@/cli/render.js";
import { withTomTomClient } from "@/cli/runtime.js";
import * as BoundingBox from "@/domain/shared/BoundingBox.js";
import { ValidationError } from "@/domain/shared/errors.js";

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

const flowStyleOption = Options.choice("style", [
  "absolute",
  "relative",
  "relative0",
  "relative0-dark",
  "relative-delay",
  "reduced-sensitivity",
] as const);

const flowSegmentCommand = Command.make(
  "segment",
  {
    ...globalOptions,
    point: Options.text("point").pipe(Options.withDescription('Point near the road segment, as "lat,lon"')),
    style: flowStyleOption,
    zoom: Options.integer("zoom").pipe(Options.withDescription("0-22")),
    unit: Options.choice("unit", ["kmph", "mph"] as const).pipe(Options.optional),
    thickness: Options.integer("thickness").pipe(
      Options.optional,
      Options.withDescription("1-20, default 10"),
    ),
    openLr: Options.boolean("open-lr").pipe(
      Options.withDescription("Include an OpenLR code in the response"),
    ),
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const data = yield* flowSegment({
          point: parsed.point,
          style: parsed.style,
          zoom: parsed.zoom,
          unit: Option.getOrUndefined(parsed.unit),
          thickness: Option.getOrUndefined(parsed.thickness),
          openLr: parsed.openLr,
        });
        yield* render(parsed, data, renderFlowSegment as (d: unknown) => string);
      }),
    ),
).pipe(Command.withDescription("Current speed/travel-time for the road segment nearest a point"));

const flowOutputOption = Options.text("output").pipe(
  Options.optional,
  Options.withDescription('File path to write the image to; omit or pass "-" to write to stdout'),
);

/** Writes raw image bytes to a file or stdout — never through render()/Console.log, so JSON/pretty flags never interleave with the byte stream. */
const writeFlowTile = (output: Option.Option<string>, bytes: Uint8Array) =>
  Effect.gen(function* () {
    const path = Option.getOrUndefined(output);
    if (path === undefined || path === "-") {
      yield* Effect.sync(() => process.stdout.write(bytes));
      return;
    }
    const fs = yield* FileSystem.FileSystem;
    yield* fs
      .writeFile(path, bytes)
      .pipe(Effect.mapError(() => new ValidationError({ message: `could not write ${path}` })));
  });

const flowTileCommand = Command.make(
  "tile",
  {
    ...globalOptions,
    style: flowStyleOption,
    zoom: Options.integer("zoom").pipe(Options.withDescription("0-22")),
    tileX: Options.integer("tile-x").pipe(Options.withDescription("Tile X coordinate")),
    tileY: Options.integer("tile-y").pipe(Options.withDescription("Tile Y coordinate")),
    thickness: Options.integer("thickness").pipe(
      Options.optional,
      Options.withDescription("1-20, default 10"),
    ),
    tileSize: Options.choice("tile-size", ["256", "512"] as const).pipe(Options.optional),
    output: flowOutputOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const bytes = yield* flowTile({
          style: parsed.style,
          zoom: parsed.zoom,
          x: parsed.tileX,
          y: parsed.tileY,
          thickness: Option.getOrUndefined(parsed.thickness),
          tileSize: Option.match(parsed.tileSize, { onNone: () => undefined, onSome: Number }),
        });
        yield* writeFlowTile(parsed.output, bytes);
      }),
    ),
).pipe(
  Command.withDescription(
    "Fetch a traffic-flow raster tile (raw PNG bytes — --json/--pretty don't apply here)",
  ),
);

const flow = Command.make("flow", {}, () => Console.log("Usage: tomtom traffic flow <segment|tile>")).pipe(
  Command.withDescription("Traffic Flow API — segment speed data and flow tiles"),
  Command.withSubcommands([flowSegmentCommand, flowTileCommand]),
);

export const traffic = Command.make("traffic", {}, () =>
  Console.log("Usage: tomtom traffic <incidents|details|flow>"),
).pipe(
  Command.withDescription("TomTom Traffic API"),
  Command.withSubcommands([incidentsCommand, details, flow]),
);
