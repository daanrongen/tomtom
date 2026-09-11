import { Data } from "effect";

export class AuthError extends Data.TaggedError("AuthError")<{
  readonly message: string;
}> {
  readonly exitCode = 3;
}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{
  readonly message: string;
}> {
  readonly exitCode = 4;
}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly message: string;
  readonly retryAfterSeconds?: number;
}> {
  readonly exitCode = 5;
}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
}> {
  readonly exitCode = 2;
}

export class ServerError extends Data.TaggedError("ServerError")<{
  readonly message: string;
  readonly status: number;
}> {
  readonly exitCode = 6;
}

export class TransportError extends Data.TaggedError("TransportError")<{
  readonly message: string;
}> {
  readonly exitCode = 7;
}

export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
}> {
  readonly exitCode = 2;
}

export type TomTomError =
  | AuthError
  | ForbiddenError
  | RateLimitError
  | ValidationError
  | ServerError
  | TransportError
  | ConfigError;

const TAGS: ReadonlySet<string> = new Set<TomTomError["_tag"]>([
  "AuthError",
  "ForbiddenError",
  "RateLimitError",
  "ValidationError",
  "ServerError",
  "TransportError",
  "ConfigError",
]);

export const isTomTomError = (error: unknown): error is TomTomError =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  TAGS.has((error as { _tag: unknown })._tag as string);

export const messageOf = (error: TomTomError): string => {
  switch (error._tag) {
    case "AuthError":
      return `Authentication error: ${error.message}\n\nHint: set TOMTOM_API_KEY or run \`tomtom config set api-key <key>\`.`;
    case "ForbiddenError":
      return `TomTom API error (403): ${error.message}\n\nHint: enable the relevant TomTom API in the Developer Portal.`;
    case "RateLimitError":
      return `TomTom API error (429): ${error.message}${
        error.retryAfterSeconds ? `\n\nRetry after ${error.retryAfterSeconds}s.` : ""
      }`;
    case "ServerError":
      return `TomTom API error (${error.status}): ${error.message}`;
    case "TransportError":
      return `Network error: ${error.message}`;
    case "ValidationError":
      return `Invalid input: ${error.message}`;
    case "ConfigError":
      return `Configuration error: ${error.message}`;
  }
};

/** Structured form of a {@link TomTomError}, for `--json`/`--pretty` invocations. */
export const toJson = (error: TomTomError) => ({
  error: {
    type: error._tag,
    message: error.message,
    exitCode: error.exitCode,
    ...(error._tag === "RateLimitError" && error.retryAfterSeconds !== undefined
      ? { retryAfterSeconds: error.retryAfterSeconds }
      : {}),
    ...(error._tag === "ServerError" ? { status: error.status } : {}),
  },
});
