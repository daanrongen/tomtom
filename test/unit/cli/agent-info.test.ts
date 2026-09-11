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

describe("tomtom agent-info", () => {
  test("reports the real command paths and global flag names", async () => {
    let logged = "";
    const original = console.log;
    console.log = (msg: string) => {
      logged = msg;
    };
    try {
      const exit = await Command.run(root, { name: "tomtom", version: "test" })([
        "node",
        "tomtom",
        "agent-info",
      ]).pipe(
        Effect.provide(emptyConfigStoreLayer),
        Effect.provide(fakeHttpClientLayer(() => jsonResponse(200, {}))),
        Effect.provide(BunContext.layer),
        Effect.runPromiseExit,
      );
      expect(exit._tag).toBe("Success");
    } finally {
      console.log = original;
    }
    const info = JSON.parse(logged);
    expect(info.name).toBe("tomtom");
    expect(info.commands).toContain("search fuzzy");
    expect(info.commands).toContain("config get");
    expect(info.globalFlags).toContain("--select");
    expect(info.schemas).toContain("search");
  });
});
