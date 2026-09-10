import {
  HttpClient,
  HttpClientRequest,
  type HttpMethod,
} from "@effect/platform";
import { Duration, Effect, Layer, Schedule } from "effect";
import {
  AuthError,
  ForbiddenError,
  RateLimitError,
  ServerError,
  type TomTomError,
  TransportError,
  ValidationError,
} from "@/domain/shared/errors.js";
import {
  type QueryParams,
  type RawRequest,
  type RawResponse,
  TomTomClient,
} from "@/ports/TomTomClient.js";

export interface HttpTomTomClientConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMillis: number;
  readonly maxRetries: number;
  readonly debug: boolean;
}

const buildUrl = (
  baseUrl: string,
  path: string,
  params: QueryParams,
  apiKey: string,
): URL => {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("key", apiKey);
  return url;
};

/** Renders a URL with the `key` query param masked, for safe logging. */
export const redact = (url: string | URL): string => {
  const clone = new URL(url);
  if (clone.searchParams.has("key")) clone.searchParams.set("key", "REDACTED");
  return clone.toString();
};

const isRetryable = (error: TomTomError): boolean =>
  error._tag === "RateLimitError" ||
  error._tag === "ServerError" ||
  error._tag === "TransportError";

const extractMessage = (body: string): string | undefined => {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const detailedError = parsed.detailedError;
    if (detailedError && typeof detailedError === "object") {
      const message = (detailedError as Record<string, unknown>).message;
      const code = (detailedError as Record<string, unknown>).code;
      if (typeof message === "string")
        return typeof code === "string" ? `${code}: ${message}` : message;
    }
    if (typeof parsed.message === "string") return parsed.message;
    if (typeof parsed.errorText === "string") return parsed.errorText;
    const error = parsed.error;
    if (error && typeof error === "object") {
      const description = (error as Record<string, unknown>).description;
      if (typeof description === "string") return description;
    }
  } catch {
    // not JSON — fall through to raw body
  }
  return body.length > 0 && body.length < 300 ? body : undefined;
};

const toApiError = (
  status: number,
  body: string,
  retryAfter: string | undefined,
): TomTomError => {
  const message = extractMessage(body) ?? `HTTP ${status}`;
  if (status === 401) return new AuthError({ message });
  if (status === 403) return new ForbiddenError({ message });
  if (status === 429) {
    const seconds = retryAfter ? Number(retryAfter) : undefined;
    return new RateLimitError({
      message,
      retryAfterSeconds:
        seconds !== undefined && !Number.isNaN(seconds) ? seconds : undefined,
    });
  }
  if (status === 400 || status === 404) return new ValidationError({ message });
  return new ServerError({ message, status });
};

/** Adapter implementing the {@link TomTomClient} port over `@effect/platform`'s HttpClient. */
export const layer = (
  config: HttpTomTomClientConfig,
): Layer.Layer<TomTomClient, never, HttpClient.HttpClient> =>
  Layer.effect(
    TomTomClient,
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;

      const perform = (path: string, params: QueryParams) =>
        Effect.gen(function* () {
          const url = buildUrl(config.baseUrl, path, params, config.apiKey);
          if (config.debug) {
            yield* Effect.logDebug(`GET ${redact(url)}`);
          }

          const response = yield* client.get(url).pipe(
            Effect.timeout(Duration.millis(config.timeoutMillis)),
            Effect.mapError(
              (cause): TomTomError =>
                cause._tag === "TimeoutException"
                  ? new TransportError({
                      message: `request timed out after ${config.timeoutMillis}ms`,
                    })
                  : new TransportError({ message: cause.message }),
            ),
          );

          if (response.status >= 200 && response.status < 300) {
            return yield* response.json.pipe(
              Effect.mapError(
                () =>
                  new TransportError({
                    message:
                      "TomTom returned a response that could not be parsed as JSON",
                  }),
              ),
            );
          }

          const body = yield* response.text.pipe(
            Effect.orElseSucceed(() => ""),
          );
          return yield* Effect.fail(
            toApiError(response.status, body, response.headers["retry-after"]),
          );
        });

      const get = (path: string, params: QueryParams = {}) =>
        perform(path, params).pipe(
          Effect.catchTag("RateLimitError", (error) =>
            error.retryAfterSeconds
              ? Effect.sleep(Duration.seconds(error.retryAfterSeconds)).pipe(
                  Effect.zipRight(Effect.fail(error)),
                )
              : Effect.fail(error),
          ),
          Effect.retry({
            schedule: Schedule.exponential(Duration.millis(200)).pipe(
              Schedule.jittered,
            ),
            while: isRetryable,
            times: config.maxRetries,
          }),
        );

      const request = (
        input: RawRequest,
      ): Effect.Effect<RawResponse, TomTomError> =>
        Effect.gen(function* () {
          const url = new URL(input.url);
          for (const [key, value] of Object.entries(input.params ?? {})) {
            if (value !== undefined) url.searchParams.set(key, String(value));
          }
          if (input.auth) url.searchParams.set("key", config.apiKey);

          if (config.debug) {
            yield* Effect.logDebug(
              `${input.method.toUpperCase()} ${redact(url)}`,
            );
          }

          const httpRequest = HttpClientRequest.make(
            input.method.toUpperCase() as HttpMethod.HttpMethod,
          )(url);
          const response = yield* client.execute(httpRequest).pipe(
            Effect.timeout(Duration.millis(config.timeoutMillis)),
            Effect.mapError(
              (cause): TomTomError =>
                cause._tag === "TimeoutException"
                  ? new TransportError({
                      message: `request timed out after ${config.timeoutMillis}ms`,
                    })
                  : new TransportError({ message: cause.message }),
            ),
          );
          const body = yield* response.text.pipe(
            Effect.orElseSucceed(() => ""),
          );
          return {
            status: response.status,
            headers: response.headers as Record<string, string>,
            body,
          };
        });

      return { get, request };
    }),
  );
