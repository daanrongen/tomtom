import { describe, expect, test } from "bun:test";
import { Command } from "@effect/cli";
import { BunContext } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { root } from "@/cli/commands/root.js";
import { ConfigStore } from "@/ports/ConfigStore.js";
import { fakeHttpClientLayer, jsonResponse } from "../support/fakeHttpClient.js";

const emptyConfigStoreLayer = Layer.succeed(ConfigStore, {
  path: Effect.succeed("/fake/config.toml"),
  load: Effect.succeed({}),
  save: () => Effect.succeed(undefined),
});

const run = (args: ReadonlyArray<string>) =>
  Command.run(root, { name: "tomtom", version: "test" })(["node", "tomtom", ...args]).pipe(
    Effect.provide(emptyConfigStoreLayer),
    Effect.provide(fakeHttpClientLayer(() => jsonResponse(200, { results: [] }))),
    Effect.provide(BunContext.layer),
    Effect.runPromiseExit,
  );

const errorTag = (exit: Awaited<ReturnType<typeof run>>): string | undefined =>
  exit._tag === "Failure" && exit.cause._tag === "Fail"
    ? (exit.cause.error as { _tag: string })._tag
    : undefined;

describe("search ev CLI", () => {
  test("succeeds with --lat/--lon and the orbis backend", async () => {
    const exit = await run([
      "search",
      "ev",
      "--lat",
      "51.5",
      "--lon",
      "-0.1",
      "--backend",
      "tomtom-orbis-maps",
      "--api-key",
      "k",
    ]);
    expect(exit._tag).toBe("Success");
  });

  test("succeeds with --top-left/--btm-right", async () => {
    const exit = await run([
      "search",
      "ev",
      "--top-left",
      "51.55,-0.2",
      "--btm-right",
      "51.45,-0.05",
      "--backend",
      "tomtom-orbis-maps",
      "--api-key",
      "k",
    ]);
    expect(exit._tag).toBe("Success");
  });

  test("rejects when neither a point nor a bounding box is given", async () => {
    const exit = await run(["search", "ev", "--backend", "tomtom-orbis-maps", "--api-key", "k"]);
    expect(errorTag(exit)).toBe("ValidationError");
  });

  test("rejects when --backend is not tomtom-orbis-maps", async () => {
    const exit = await run(["search", "ev", "--lat", "51.5", "--lon", "-0.1", "--api-key", "k"]);
    expect(errorTag(exit)).toBe("ValidationError");
  });
});
