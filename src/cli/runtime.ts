import { Console, Effect, Option } from "effect";
import * as HttpTomTomClient from "@/adapters/http/HttpTomTomClient.js";
import * as ConfigService from "@/application/ConfigService.js";
import { isTomTomError, toJson } from "@/domain/shared/errors.js";
import type { GlobalFlags } from "./options.js";

/** Resolves config from the parsed global flags and provides a TomTomClient scoped to this invocation. */
export const withTomTomClient = <A, E, R>(
  flags: GlobalFlags,
  effect: Effect.Effect<A, E, R>,
  options: { readonly apiKeyRequired?: boolean } = {},
) =>
  Effect.gen(function* () {
    const resolved = yield* ConfigService.resolve({
      apiKeyOption: Option.getOrUndefined(flags.apiKey),
      timeoutSecondsOption: Option.getOrUndefined(flags.timeout),
      retryOption: Option.getOrUndefined(flags.retry),
      noRetry: flags.noRetry,
      debug: flags.debug,
      apiKeyRequired: options.apiKeyRequired,
    });
    const clientLayer = HttpTomTomClient.layer({
      apiKey: resolved.apiKey,
      baseUrl: resolved.baseUrl,
      timeoutMillis: resolved.timeoutMillis,
      maxRetries: resolved.maxRetries,
      debug: resolved.debug,
    });
    return yield* Effect.provide(effect, clientLayer);
  }).pipe(
    Effect.catchAll((error) => {
      if (!(flags.json || flags.pretty) || !isTomTomError(error)) return Effect.fail(error);
      return Console.error(JSON.stringify(toJson(error), null, flags.pretty ? 2 : undefined)).pipe(
        Effect.zipRight(
          Effect.sync(() => {
            process.exitCode = error.exitCode;
          }),
        ),
      );
    }),
  );
