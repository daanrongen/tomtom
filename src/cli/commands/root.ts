import { Command } from "@effect/cli";
import { Console } from "effect";
import { agentInfo } from "./agentInfo.js";
import { api } from "./api.js";
import { config } from "./config.js";
import { geocodeCommand, reverseGeocodeCommand } from "./geocode.js";
import { map } from "./map.js";
import { route } from "./route.js";
import { schema } from "./schema.js";
import { search } from "./search.js";
import { traffic } from "./traffic.js";

export const root = Command.make("tomtom", {}, () =>
  Console.log("Run `tomtom --help` to see available commands."),
).pipe(
  Command.withDescription("A Unix-friendly CLI for TomTom's location APIs"),
  Command.withSubcommands([
    config,
    search,
    geocodeCommand,
    reverseGeocodeCommand,
    route,
    traffic,
    map,
    api,
    schema,
    agentInfo,
  ]),
);
