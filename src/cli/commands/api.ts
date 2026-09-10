import { Command, Options } from "@effect/cli";
import { Console, Effect, HashMap, Option } from "effect";
import { request } from "@/application/ApiService.js";
import { type GlobalFlags, globalOptions } from "@/cli/options.js";
import { withTomTomClient } from "@/cli/runtime.js";
import { ValidationError } from "@/domain/shared/errors.js";

const methodOption = Options.choice("method", [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const).pipe(
  Options.withDefault("GET"),
  Options.withDescription("HTTP method"),
);
const pathOption = Options.text("path").pipe(
  Options.optional,
  Options.withDescription(
    "Path relative to the configured API host, e.g. /search/2/geocode/London.json",
  ),
);
const urlOption = Options.text("url").pipe(
  Options.optional,
  Options.withDescription("Full URL, overrides --path"),
);
const paramOption = Options.keyValueMap("param").pipe(
  Options.withDefault(HashMap.empty<string, string>()),
  Options.withDescription("Extra query param, key=value; repeatable"),
);
const noAuthOption = Options.boolean("no-auth").pipe(
  Options.withDefault(false),
  Options.withDescription("Do not append the TomTom API key"),
);

const requestCommand = Command.make(
  "request",
  {
    ...globalOptions,
    method: methodOption,
    path: pathOption,
    url: urlOption,
    param: paramOption,
    noAuth: noAuthOption,
  },
  (parsed) =>
    withTomTomClient(
      parsed as GlobalFlags,
      Effect.gen(function* () {
        const baseUrl = process.env.TOMTOM_API_HOST ?? "https://api.tomtom.com";
        const explicitUrl = Option.getOrUndefined(parsed.url);
        const explicitPath = Option.getOrUndefined(parsed.path);
        const url = explicitUrl
          ? explicitUrl
          : explicitPath
            ? new URL(explicitPath, baseUrl).toString()
            : yield* Effect.fail(
                new ValidationError({
                  message: "one of --path or --url is required",
                }),
              );

        const params: Record<string, string> = {};
        for (const [key, value] of HashMap.entries(parsed.param))
          params[key] = value;

        const response = yield* request({
          method: parsed.method,
          url,
          params,
          auth: !parsed.noAuth,
        });

        if (parsed.raw) {
          yield* Console.log(response.body);
          return;
        }
        if (parsed.json || parsed.pretty) {
          const body = tryParseJson(response.body);
          const envelope = {
            status: response.status,
            headers: response.headers,
            body,
          };
          yield* Console.log(
            parsed.pretty
              ? JSON.stringify(envelope, null, 2)
              : JSON.stringify(envelope),
          );
          return;
        }
        yield* Console.log(`HTTP ${response.status}`);
        yield* Console.log(prettyIfJson(response.body));
      }),
      { apiKeyRequired: !parsed.noAuth },
    ),
).pipe(
  Command.withDescription(
    "Raw escape hatch: call any TomTom endpoint directly",
  ),
);

const tryParseJson = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

const prettyIfJson = (body: string): string => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

export const api = Command.make("api", {}, () =>
  Console.log("Usage: tomtom api request --method GET --url <url>"),
).pipe(
  Command.withDescription(
    "Expert escape hatch for endpoints this CLI doesn't wrap yet",
  ),
  Command.withSubcommands([requestCommand]),
);
