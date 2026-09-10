import { homedir, platform } from "node:os";
import { FileSystem, Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import * as TOML from "smol-toml";
import { ConfigError } from "@/domain/shared/errors.js";
import { ConfigStore, type StoredConfig } from "@/ports/ConfigStore.js";

const toConfigError = (error: unknown): ConfigError =>
  new ConfigError({
    message: error instanceof Error ? error.message : String(error),
  });

const resolveConfigPath = (path: Path.Path): string => {
  const home = homedir();
  if (platform() === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "tomtom",
      "config.toml",
    );
  }
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  return path.join(
    xdgConfigHome ?? path.join(home, ".config"),
    "tomtom",
    "config.toml",
  );
};

/**
 * Adapter implementing the {@link ConfigStore} port as a TOML file, 0600-permissioned.
 * `overridePath` exists so tests don't have to touch the real home directory.
 */
export const layer = (
  overridePath?: string,
): Layer.Layer<ConfigStore, never, FileSystem.FileSystem | Path.Path> =>
  Layer.effect(
    ConfigStore,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const file = overridePath ?? resolveConfigPath(path);

      const load = Effect.gen(function* () {
        const exists = yield* fs
          .exists(file)
          .pipe(Effect.mapError(toConfigError));
        if (!exists) return {};
        const content = yield* fs
          .readFileString(file)
          .pipe(Effect.mapError(toConfigError));
        return yield* Effect.try({
          try: () => TOML.parse(content) as StoredConfig,
          catch: () =>
            new ConfigError({ message: `${file} is not valid TOML` }),
        });
      });

      const save = (config: StoredConfig) =>
        Effect.gen(function* () {
          yield* fs
            .makeDirectory(path.dirname(file), { recursive: true })
            .pipe(Effect.mapError(toConfigError));
          yield* fs
            .writeFileString(file, TOML.stringify(config))
            .pipe(Effect.mapError(toConfigError));
          yield* fs.chmod(file, 0o600).pipe(Effect.mapError(toConfigError));
        });

      return { path: Effect.succeed(file), load, save };
    }),
  );
