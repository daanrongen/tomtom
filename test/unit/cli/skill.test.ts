import { describe, expect, test } from "bun:test";
import { Command } from "@effect/cli";
import { BunContext } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { root } from "@/cli/commands/root.js";
import { ConfigStore } from "@/ports/ConfigStore.js";
import pkg from "../../../package.json" with { type: "json" };
import { fakeHttpClientLayer, jsonResponse } from "../support/fakeHttpClient.js";

const emptyConfigStoreLayer = Layer.succeed(ConfigStore, {
  path: Effect.succeed("/fake/config.toml"),
  load: Effect.succeed({}),
  save: () => Effect.succeed(undefined),
});

describe("tomtom skill", () => {
  test("prints SKILL.md frontmatter with the version substituted", async () => {
    let logged = "";
    const original = console.log;
    console.log = (msg: string) => {
      logged = msg;
    };
    try {
      const exit = await Command.run(root, { name: "tomtom", version: "test" })([
        "node",
        "tomtom",
        "skill",
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
    expect(logged.startsWith("---")).toBe(true);
    expect(logged).toContain("name: tomtom");
    expect(logged).toContain(`compatibility: tomtom CLI ${pkg.version}`);
    expect(logged).not.toContain("{{VERSION}}");
  });
});
