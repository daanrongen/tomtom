import type { Args, Options } from "@effect/cli";
import { Command } from "@effect/cli";
import { Effect } from "effect";
import { NotImplementedError } from "@/domain/shared/errors.js";

// biome-ignore lint/suspicious/noExplicitAny: Options/Args are invariant in their value type; this is glue code.
type AnyOptionOrArg = Options.Options<any> | Args.Args<any>;

/** A command wired into the tree with the right name/args shape, but not implemented yet (spec Phase 2/3). */
export const notImplemented = (
  name: string,
  feature: string,
  globalOptions: Record<string, AnyOptionOrArg>,
  extra: Record<string, AnyOptionOrArg> = {},
) =>
  Command.make(name, { ...globalOptions, ...extra }, () =>
    Effect.fail(new NotImplementedError({ feature })),
  ).pipe(
    Command.withDescription(
      "Not yet implemented — planned for a future release of tomtom",
    ),
  );
