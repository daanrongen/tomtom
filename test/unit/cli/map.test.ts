import { describe, expect, test } from "bun:test";
import { Command } from "@effect/cli";
import { BunContext } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { root } from "@/cli/commands/root.js";
import { ConfigStore } from "@/ports/ConfigStore.js";
import { binaryResponse, fakeHttpClientLayer } from "../support/fakeHttpClient.js";

const emptyConfigStoreLayer = Layer.succeed(ConfigStore, {
  path: Effect.succeed("/fake/config.toml"),
  load: Effect.succeed({}),
  save: () => Effect.succeed(undefined),
});

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const run = (args: ReadonlyArray<string>) =>
  Command.run(root, { name: "tomtom", version: "test" })(["node", "tomtom", ...args]).pipe(
    Effect.provide(emptyConfigStoreLayer),
    Effect.provide(fakeHttpClientLayer(() => binaryResponse(200, pngBytes))),
    Effect.provide(BunContext.layer),
    Effect.runPromiseExit,
  );

const errorTag = (exit: Awaited<ReturnType<typeof run>>): string | undefined =>
  exit._tag === "Failure" && exit.cause._tag === "Fail"
    ? (exit.cause.error as { _tag: string })._tag
    : undefined;

describe("map CLI", () => {
  test("map static writes PNG bytes to stdout by default", async () => {
    const exit = await run(["map", "static", "--center", "51.5,-0.1", "--api-key", "k"]);
    expect(exit._tag).toBe("Success");
  });

  test("map static rejects when both --center and --bbox are given", async () => {
    const exit = await run([
      "map",
      "static",
      "--center",
      "51.5,-0.1",
      "--bbox",
      "-0.2,51.4,0.1,51.6",
      "--api-key",
      "k",
    ]);
    expect(errorTag(exit)).toBe("ValidationError");
  });

  test("map tile writes tile bytes to stdout by default", async () => {
    const exit = await run([
      "map",
      "tile",
      "--zoom",
      "10",
      "--tile-x",
      "511",
      "--tile-y",
      "340",
      "--api-key",
      "k",
    ]);
    expect(exit._tag).toBe("Success");
  });

  test("map tile defaults layer/style/format to basic/main/png", async () => {
    const exit = await run([
      "map",
      "tile",
      "--zoom",
      "1",
      "--tile-x",
      "0",
      "--tile-y",
      "0",
      "--api-key",
      "k",
    ]);
    expect(exit._tag).toBe("Success");
  });
});
