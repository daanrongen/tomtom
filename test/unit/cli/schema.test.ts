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
    Effect.provide(fakeHttpClientLayer(() => jsonResponse(200, {}))),
    Effect.provide(BunContext.layer),
    Effect.runPromiseExit,
  );

const errorTag = (exit: Awaited<ReturnType<typeof run>>): string | undefined =>
  exit._tag === "Failure" && exit.cause._tag === "Fail"
    ? (exit.cause.error as { _tag: string })._tag
    : undefined;

describe("tomtom schema", () => {
  test("a known command produces a valid-looking JSON Schema object", async () => {
    let logged = "";
    const original = console.log;
    console.log = (msg: string) => {
      logged = msg;
    };
    try {
      const exit = await run(["schema", "search"]);
      expect(exit._tag).toBe("Success");
    } finally {
      console.log = original;
    }
    const parsed = JSON.parse(logged);
    expect(parsed.type).toBe("object");
    expect(parsed.properties).toBeDefined();
  });

  test("an unknown command fails with ValidationError", async () => {
    const exit = await run(["schema", "not-a-real-command"]);
    expect(errorTag(exit)).toBe("ValidationError");
  });

  test("no arguments lists the available commands", async () => {
    const exit = await run(["schema"]);
    expect(exit._tag).toBe("Success");
  });
});
