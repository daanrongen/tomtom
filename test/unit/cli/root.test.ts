import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Command } from "@effect/cli";
import { BunContext } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { root } from "@/cli/commands/root.js";
import { rewriteSearchAlias } from "@/cli/searchAlias.js";
import { ConfigStore } from "@/ports/ConfigStore.js";
import { fakeHttpClientLayer, jsonResponse } from "../support/fakeHttpClient.js";

const emptyConfigStoreLayer = Layer.succeed(ConfigStore, {
  path: Effect.succeed("/fake/config.toml"),
  load: Effect.succeed({}),
  save: () => Effect.succeed(undefined),
});

const run = (args: ReadonlyArray<string>) =>
  Command.run(root, { name: "tomtom", version: "test" })([
    "node",
    "tomtom",
    ...rewriteSearchAlias(args),
  ]).pipe(
    Effect.provide(emptyConfigStoreLayer),
    Effect.provide(fakeHttpClientLayer(() => jsonResponse(200, { results: [] }))),
    Effect.provide(BunContext.layer),
    Effect.runPromiseExit,
  );

const errorTag = (exit: Awaited<ReturnType<typeof run>>): string | undefined =>
  exit._tag === "Failure" && exit.cause._tag === "Fail"
    ? (exit.cause.error as { _tag: string })._tag
    : undefined;

describe("root CLI", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    originalApiKey = process.env.TOMTOM_API_KEY;
    delete process.env.TOMTOM_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.TOMTOM_API_KEY;
    else process.env.TOMTOM_API_KEY = originalApiKey;
  });

  test("rejects an invalid bounding box", async () => {
    const exit = await run(["traffic", "incidents", "--bbox", "not-a-bbox", "--api-key", "k"]);
    expect(errorTag(exit)).toBe("ValidationError");
  });

  test("with --json, a domain error is reported as structured JSON instead of failing the process", async () => {
    let logged = "";
    const originalError = console.error;
    const originalExitCode = process.exitCode;
    console.error = (msg: string) => {
      logged = msg;
    };
    let exit: Awaited<ReturnType<typeof run>>;
    try {
      exit = await run(["traffic", "incidents", "--bbox", "not-a-bbox", "--api-key", "k", "--json"]);
    } finally {
      console.error = originalError;
      process.exitCode = originalExitCode;
    }
    expect(exit._tag).toBe("Success");
    expect(JSON.parse(logged)).toMatchObject({ error: { type: "ValidationError", exitCode: 2 } });
  });

  test("fails with ConfigError when no API key is configured anywhere", async () => {
    const exit = await run(["geocode", "London"]);
    expect(errorTag(exit)).toBe("ConfigError");
  });

  test("rejects mutually exclusive --depart-at/--arrive-at", async () => {
    const exit = await run([
      "route",
      "calculate",
      "--api-key",
      "k",
      "--from",
      "51.5,-0.1",
      "--to",
      "51.6,-0.2",
      "--depart-at",
      "2026-01-01T00:00:00",
      "--arrive-at",
      "2026-01-01T01:00:00",
    ]);
    expect(errorTag(exit)).toBe("ValidationError");
  });

  test("search category resolves the positional into categorySet", async () => {
    const exit = await run(["search", "category", "7315", "--api-key", "k"]);
    expect(exit._tag).toBe("Success");
  });

  test("search brand resolves the positional into brandSet", async () => {
    const exit = await run(["search", "brand", "Starbucks", "--api-key", "k"]);
    expect(exit._tag).toBe("Success");
  });

  test("the bare `search <query>` alias reaches fuzzy search", async () => {
    const exit = await run(["search", "coffee", "--api-key", "k"]);
    expect(exit._tag).toBe("Success");
  });
});
