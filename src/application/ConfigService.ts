import { Effect } from "effect";
import { ConfigError } from "@/domain/shared/errors.js";
import { type Backend, ConfigStore } from "@/ports/ConfigStore.js";

export interface ResolvedConfig {
  readonly apiKey: string;
  readonly backend: Backend;
  readonly baseUrl: string;
  readonly timeoutMillis: number;
  readonly maxRetries: number;
  readonly debug: boolean;
}

export interface ResolveInput {
  readonly apiKeyOption?: string;
  readonly backendOption?: Backend;
  readonly timeoutSecondsOption?: number;
  readonly retryOption?: number;
  readonly noRetry?: boolean;
  readonly debug?: boolean;
  /** Set false for `api request --no-auth`, which may target a URL that needs no TomTom key at all. */
  readonly apiKeyRequired?: boolean;
}

const DEFAULT_BASE_URL = "https://api.tomtom.com";
const DEFAULT_TIMEOUT_SECONDS = 15;
const DEFAULT_RETRIES = 2;

/** Parses a duration like "15s" or "15" (seconds) — a deliberately small parser, not full ISO-8601. */
const parseSeconds = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  const seconds = Number(
    trimmed.endsWith("s") ? trimmed.slice(0, -1) : trimmed,
  );
  return Number.isNaN(seconds) ? undefined : seconds;
};

/** Resolves the effective config from: CLI flags > env vars > config file > defaults. */
export const resolve = (
  input: ResolveInput,
): Effect.Effect<ResolvedConfig, ConfigError, ConfigStore> =>
  Effect.gen(function* () {
    const store = yield* ConfigStore;
    const stored = yield* store.load;

    const apiKey =
      input.apiKeyOption ?? process.env.TOMTOM_API_KEY ?? stored.apiKey;
    if (!apiKey && input.apiKeyRequired !== false) {
      return yield* Effect.fail(
        new ConfigError({
          message:
            "no API key configured. Set --api-key, export TOMTOM_API_KEY, or run `tomtom config set api-key <key>`.",
        }),
      );
    }

    const backend: Backend =
      input.backendOption ??
      (process.env.TOMTOM_MAPS_BACKEND as Backend | undefined) ??
      stored.backend ??
      "tomtom-maps";

    const baseUrl = process.env.TOMTOM_API_HOST ?? DEFAULT_BASE_URL;

    const timeoutSeconds =
      input.timeoutSecondsOption ??
      parseSeconds(process.env.TOMTOM_TIMEOUT) ??
      parseSeconds(stored.timeout) ??
      DEFAULT_TIMEOUT_SECONDS;

    const maxRetries = input.noRetry
      ? 0
      : (input.retryOption ??
        Number(
          process.env.TOMTOM_RETRIES ?? stored.retries ?? DEFAULT_RETRIES,
        ));

    return {
      apiKey: apiKey ?? "",
      backend,
      baseUrl,
      timeoutMillis: timeoutSeconds * 1000,
      maxRetries,
      debug: input.debug ?? false,
    };
  });
