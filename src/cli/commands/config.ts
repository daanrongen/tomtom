import { Args, Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { geocode } from "@/application/GeocodeService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { withTomTomClient } from "@/cli/runtime.js";
import { ValidationError } from "@/domain/shared/errors.js";
import { ConfigStore } from "@/ports/ConfigStore.js";

const VALID_KEYS = [
  "api-key",
  "backend",
  "timeout",
  "retries",
  "output",
] as const;
type ConfigKey = (typeof VALID_KEYS)[number];

const fieldOf = (key: ConfigKey) => (key === "api-key" ? "apiKey" : key);

const coerce = (key: ConfigKey, value: string): string | number =>
  key === "retries" ? Number(value) : value;

const redactApiKey = (apiKey: string | undefined): string | undefined =>
  apiKey
    ? `${"*".repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}`
    : undefined;

const get = Command.make("get", {}, () =>
  Effect.gen(function* () {
    const store = yield* ConfigStore;
    const stored = yield* store.load;
    yield* Console.log(
      JSON.stringify(
        { ...stored, apiKey: redactApiKey(stored.apiKey) },
        null,
        2,
      ),
    );
  }),
).pipe(
  Command.withDescription("Print the resolved config file (API key redacted)"),
);

const set = Command.make(
  "set",
  {
    key: Args.text({ name: "key" }).pipe(
      Args.withDescription(`One of: ${VALID_KEYS.join(", ")}`),
    ),
    value: Args.text({ name: "value" }),
  },
  ({ key, value }) =>
    Effect.gen(function* () {
      if (!(VALID_KEYS as ReadonlyArray<string>).includes(key)) {
        return yield* Effect.fail(
          new ValidationError({
            message: `unknown config key "${key}" (expected one of: ${VALID_KEYS.join(", ")})`,
          }),
        );
      }
      const store = yield* ConfigStore;
      const current = yield* store.load;
      yield* store.save({
        ...current,
        [fieldOf(key as ConfigKey)]: coerce(key as ConfigKey, value),
      });
      yield* Console.log(`Saved ${key}.`);
    }),
).pipe(
  Command.withDescription(
    "Set a config value, e.g. `tomtom config set api-key <key>`",
  ),
);

const path = Command.make("path", {}, () =>
  Effect.gen(function* () {
    const store = yield* ConfigStore;
    yield* Console.log(yield* store.path);
  }),
).pipe(Command.withDescription("Print the config file path"));

const test = Command.make("test", globalOptions, (flags: GlobalFlags) =>
  withTomTomClient(
    flags,
    Effect.gen(function* () {
      yield* geocode({ query: "Amsterdam", limit: 1 });
      yield* Console.log(
        "OK: the configured API key can reach the TomTom Search API.",
      );
    }),
  ),
).pipe(
  Command.withDescription(
    "Validate the configured API key against a real TomTom endpoint",
  ),
);

export const config = Command.make("config", {}, () =>
  Console.log("Usage: tomtom config <get|set|path|test>"),
).pipe(
  Command.withDescription("Manage tomtom's configuration"),
  Command.withSubcommands([get, set, path, test]),
);
