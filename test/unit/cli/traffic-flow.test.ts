import { describe, expect, test } from "bun:test";
import { Command } from "@effect/cli";
import { BunContext } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { root } from "@/cli/commands/root.js";
import { ConfigStore } from "@/ports/ConfigStore.js";
import { binaryResponse, fakeHttpClientLayer, jsonResponse } from "../support/fakeHttpClient.js";

const emptyConfigStoreLayer = Layer.succeed(ConfigStore, {
  path: Effect.succeed("/fake/config.toml"),
  load: Effect.succeed({}),
  save: () => Effect.succeed(undefined),
});

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
const segmentBody = {
  flowSegmentData: { frc: "FRC0", currentSpeed: 50, freeFlowSpeed: 60, confidence: 0.9 },
};

const run = (args: ReadonlyArray<string>) =>
  Command.run(root, { name: "tomtom", version: "test" })(["node", "tomtom", ...args]).pipe(
    Effect.provide(emptyConfigStoreLayer),
    Effect.provide(
      fakeHttpClientLayer((request) =>
        request.url.includes("/tile/flow/") ? binaryResponse(200, pngBytes) : jsonResponse(200, segmentBody),
      ),
    ),
    Effect.provide(BunContext.layer),
    Effect.runPromiseExit,
  );

const errorTag = (exit: Awaited<ReturnType<typeof run>>): string | undefined =>
  exit._tag === "Failure" && exit.cause._tag === "Fail"
    ? (exit.cause.error as { _tag: string })._tag
    : undefined;

describe("traffic flow CLI", () => {
  test("traffic flow segment prints human-readable output by default", async () => {
    const exit = await run([
      "traffic",
      "flow",
      "segment",
      "--point",
      "51.5,-0.1",
      "--style",
      "relative",
      "--zoom",
      "10",
      "--api-key",
      "k",
    ]);
    expect(exit._tag).toBe("Success");
  });

  test("traffic flow segment rejects an invalid point", async () => {
    const exit = await run([
      "traffic",
      "flow",
      "segment",
      "--point",
      "not-a-point",
      "--style",
      "relative",
      "--zoom",
      "10",
      "--api-key",
      "k",
    ]);
    expect(errorTag(exit)).toBe("ValidationError");
  });

  test("traffic flow tile writes PNG bytes to stdout by default", async () => {
    const exit = await run([
      "traffic",
      "flow",
      "tile",
      "--style",
      "relative",
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
});
