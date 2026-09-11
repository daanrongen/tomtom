import { Command } from "@effect/cli";
import { Console } from "effect";
import { globalOptions } from "@/cli/options.js";
import { notImplemented } from "./stubs.js";

const evRoute = notImplemented("route", "ev route", globalOptions);
const evSearch = notImplemented("search", "ev search", globalOptions);

export const ev = Command.make("ev", {}, () => Console.log("Usage: tomtom ev <route|search>")).pipe(
  Command.withDescription("Orbis EV routing and charging search (requires --backend tomtom-orbis-maps)"),
  Command.withSubcommands([evRoute, evSearch]),
);

export const dataViz = notImplemented("data-viz", "data-viz", globalOptions).pipe(
  Command.withDescription("Orbis Data Visualization API"),
);
