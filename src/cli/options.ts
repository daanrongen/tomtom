import { Options } from "@effect/cli";
import type { Option } from "effect";

export const jsonOption = Options.boolean("json").pipe(
  Options.withDefault(false),
  Options.withDescription("Machine-readable JSON output"),
);
export const prettyOption = Options.boolean("pretty").pipe(
  Options.withDefault(false),
  Options.withDescription("Pretty-printed JSON output"),
);
export const rawOption = Options.boolean("raw").pipe(
  Options.withDefault(false),
  Options.withDescription("Return the upstream response body as-is"),
);
export const apiKeyOption = Options.text("api-key").pipe(
  Options.optional,
  Options.withDescription("Explicit TomTom API key (overrides TOMTOM_API_KEY and the config file)"),
);
export const timeoutOption = Options.integer("timeout").pipe(
  Options.optional,
  Options.withDescription("HTTP timeout in seconds"),
);
export const connectTimeoutOption = Options.integer("connect-timeout").pipe(
  Options.optional,
  Options.withDescription("Connect timeout in seconds (best-effort; folded into --timeout)"),
);
export const retryOption = Options.integer("retry").pipe(
  Options.optional,
  Options.withDescription("Max retry attempts for transient (429/5xx) errors"),
);
export const noRetryOption = Options.boolean("no-retry").pipe(
  Options.withDefault(false),
  Options.withDescription("Disable retries"),
);
export const quietOption = Options.boolean("quiet").pipe(Options.withDefault(false), Options.withAlias("q"));
export const verboseOption = Options.boolean("verbose").pipe(
  Options.withDefault(false),
  Options.withAlias("v"),
);
export const debugOption = Options.boolean("debug").pipe(Options.withDefault(false));

/** Spread into every leaf command's config object. */
export const globalOptions = {
  json: jsonOption,
  pretty: prettyOption,
  raw: rawOption,
  apiKey: apiKeyOption,
  timeout: timeoutOption,
  connectTimeout: connectTimeoutOption,
  retry: retryOption,
  noRetry: noRetryOption,
  quiet: quietOption,
  verbose: verboseOption,
  debug: debugOption,
};

export interface GlobalFlags {
  readonly json: boolean;
  readonly pretty: boolean;
  readonly raw: boolean;
  readonly apiKey: Option.Option<string>;
  readonly timeout: Option.Option<number>;
  readonly connectTimeout: Option.Option<number>;
  readonly retry: Option.Option<number>;
  readonly noRetry: boolean;
  readonly quiet: boolean;
  readonly verbose: boolean;
  readonly debug: boolean;
}
