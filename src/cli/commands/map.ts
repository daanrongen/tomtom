import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Console, Effect, Option } from "effect";
import { staticImage, tile } from "@/application/MapService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { withTomTomClient } from "@/cli/runtime.js";
import { ValidationError } from "@/domain/shared/errors.js";

const outputOption = Options.text("output").pipe(
  Options.optional,
  Options.withDescription('File path to write the image to; omit or pass "-" to write to stdout'),
);

/** Writes raw image bytes to a file or stdout — never through render()/Console.log, so JSON/pretty flags never interleave with the byte stream. */
const writeImage = (output: Option.Option<string>, bytes: Uint8Array) =>
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

const staticCommand = Command.make(
  "static",
  {
    ...globalOptions,
    center: Options.text("center").pipe(
      Options.optional,
      Options.withDescription('Center point as "lat,lon" — mutually exclusive with --bbox'),
    ),
    bbox: Options.text("bbox").pipe(
      Options.optional,
      Options.withDescription("minLon,minLat,maxLon,maxLat — mutually exclusive with --center"),
    ),
    zoom: Options.integer("zoom").pipe(Options.optional, Options.withDescription("0-22, default 12")),
    width: Options.integer("width").pipe(Options.optional, Options.withDescription("Pixels, default 512")),
    height: Options.integer("height").pipe(Options.optional, Options.withDescription("Pixels, default 512")),
    format: Options.choice("format", ["png", "jpg", "jpeg"] as const).pipe(Options.optional),
    layer: Options.choice("layer", ["basic", "hybrid", "labels"] as const).pipe(Options.optional),
    style: Options.choice("style", ["main", "night"] as const).pipe(Options.optional),
    view: Options.text("view").pipe(Options.optional),
    language: Options.text("language").pipe(Options.optional),
    output: outputOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const bytes = yield* staticImage({
          center: Option.getOrUndefined(parsed.center),
          bbox: Option.getOrUndefined(parsed.bbox),
          zoom: Option.getOrUndefined(parsed.zoom),
          width: Option.getOrUndefined(parsed.width),
          height: Option.getOrUndefined(parsed.height),
          format: Option.getOrUndefined(parsed.format),
          layer: Option.getOrUndefined(parsed.layer),
          style: Option.getOrUndefined(parsed.style),
          view: Option.getOrUndefined(parsed.view),
          language: Option.getOrUndefined(parsed.language),
        });
        yield* writeImage(parsed.output, bytes);
      }),
    ),
).pipe(
  Command.withDescription(
    "Render a static map image (raw PNG/JPEG bytes — --json/--pretty don't apply here)",
  ),
);

const tileCommand = Command.make(
  "tile",
  {
    ...globalOptions,
    layer: Options.choice("layer", ["basic", "hybrid", "labels"] as const).pipe(Options.withDefault("basic")),
    style: Options.choice("style", ["main", "night"] as const).pipe(Options.withDefault("main")),
    zoom: Options.integer("zoom").pipe(Options.withDescription("0-22")),
    tileX: Options.integer("tile-x").pipe(Options.withDescription("Tile X coordinate")),
    tileY: Options.integer("tile-y").pipe(Options.withDescription("Tile Y coordinate")),
    format: Options.choice("format", ["png", "jpg"] as const).pipe(Options.withDefault("png")),
    tileSize: Options.choice("tile-size", ["256", "512"] as const).pipe(Options.optional),
    view: Options.text("view").pipe(Options.optional),
    language: Options.text("language").pipe(Options.optional),
    output: outputOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const bytes = yield* tile({
          layer: parsed.layer,
          style: parsed.style,
          zoom: parsed.zoom,
          x: parsed.tileX,
          y: parsed.tileY,
          format: parsed.format,
          tileSize: Option.match(parsed.tileSize, { onNone: () => undefined, onSome: Number }),
          view: Option.getOrUndefined(parsed.view),
          language: Option.getOrUndefined(parsed.language),
        });
        yield* writeImage(parsed.output, bytes);
      }),
    ),
).pipe(
  Command.withDescription(
    "Fetch a single raster map tile (raw PNG/JPEG bytes — --json/--pretty don't apply here)",
  ),
);

export const map = Command.make("map", {}, () => Console.log("Usage: tomtom map <static|tile>")).pipe(
  Command.withDescription("Map Display API — static maps and tiles"),
  Command.withSubcommands([staticCommand, tileCommand]),
);
