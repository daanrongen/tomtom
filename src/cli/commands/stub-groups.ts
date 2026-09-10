import { Command } from "@effect/cli";
import { Console } from "effect";
import { globalOptions } from "@/cli/options.js";
import { notImplemented } from "./stubs.js";

const evRoute = notImplemented("route", "ev route", globalOptions);
const evSearch = notImplemented("search", "ev search", globalOptions);

export const ev = Command.make("ev", {}, () =>
  Console.log("Usage: tomtom ev <route|search>"),
).pipe(
  Command.withDescription(
    "Orbis EV routing and charging search (requires --backend tomtom-orbis-maps)",
  ),
  Command.withSubcommands([evRoute, evSearch]),
);

const mapStatic = notImplemented("static", "map static", globalOptions);
const mapTile = notImplemented("tile", "map tile", globalOptions);

export const map = Command.make("map", {}, () =>
  Console.log("Usage: tomtom map <static|tile>"),
).pipe(
  Command.withDescription("Map Display API — static maps and tiles"),
  Command.withSubcommands([mapStatic, mapTile]),
);

export const dataViz = notImplemented(
  "data-viz",
  "data-viz",
  globalOptions,
).pipe(Command.withDescription("Orbis Data Visualization API"));
