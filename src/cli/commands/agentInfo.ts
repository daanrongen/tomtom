import { Command, Options } from "@effect/cli";
import { Console, HashMap, Option } from "effect";
import { globalOptions } from "@/cli/options.js";
import { SCHEMAS } from "@/cli/schemas.js";
import pkg from "../../../package.json" with { type: "json" };
import { root } from "./root.js";

/**
 * `@effect/cli`'s `getSubcommands` only exposes one level from the command it's given, and
 * (confirmed live) the returned descriptor values can't reliably be re-queried themselves —
 * so only the top level is derived dynamically here; the second level is a small,
 * colocated list to keep in sync when a command group's subcommands change.
 */
const SUBCOMMANDS: Record<string, ReadonlyArray<string>> = {
  config: ["get", "set", "path", "test"],
  search: ["fuzzy", "poi", "nearby", "category", "brand"],
  route: ["calculate", "matrix", "reachable-range"],
  traffic: ["incidents", "details", "flow segment", "flow tile"],
  map: ["static", "tile"],
  api: ["request"],
};

const commandPaths = (): ReadonlyArray<string> =>
  HashMap.toEntries(Command.getSubcommands(root)).flatMap(([name]) => {
    const children = SUBCOMMANDS[name];
    return children ? children.map((child) => `${name} ${child}`) : [name];
  });

const globalFlagNames = (): ReadonlyArray<string> =>
  (Object.values(globalOptions) as Array<Options.Options<unknown>>)
    .map((opt) => Option.getOrUndefined(Options.getIdentifier(opt)))
    .filter((name): name is string => name !== undefined);

export const agentInfo = Command.make("agent-info", {}, () =>
  Console.log(
    JSON.stringify(
      {
        name: "tomtom",
        version: pkg.version,
        outputModes: ["human", "json", "pretty", "raw"],
        globalFlags: globalFlagNames(),
        commands: commandPaths(),
        schemas: Object.keys(SCHEMAS),
      },
      null,
      2,
    ),
  ),
).pipe(
  Command.withDescription(
    "Machine-readable capability manifest: commands, global flags, and available schemas",
  ),
);
