#!/usr/bin/env bun
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Console, Effect } from "effect";
import * as FileConfigStore from "@/adapters/config/FileConfigStore.js";
import { isTomTomError, messageOf } from "@/domain/shared/errors.js";
import pkg from "../../package.json" with { type: "json" };
import { root } from "./commands/root.js";
import { rewriteSearchAlias } from "./searchAlias.js";

// @effect/cli expects the full process.argv (it strips the exec/script entries itself).
const argv = [...process.argv.slice(0, 2), ...rewriteSearchAlias(process.argv.slice(2))];

const program = Command.run(root, { name: "tomtom", version: pkg.version })(argv);

program.pipe(
  Effect.catchAll((error) =>
    isTomTomError(error)
      ? Console.error(messageOf(error)).pipe(
          Effect.zipRight(
            Effect.sync(() => {
              process.exitCode = error.exitCode;
            }),
          ),
        )
      : Effect.fail(error),
  ),
  Effect.provide(FileConfigStore.layer()),
  Effect.provide(FetchHttpClient.layer),
  Effect.provide(BunContext.layer),
  BunRuntime.runMain,
);
