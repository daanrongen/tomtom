import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Effect, Exit, Layer } from "effect";
import * as ConfigService from "@/application/ConfigService.js";
import { ConfigStore, type StoredConfig } from "@/ports/ConfigStore.js";

const storeLayer = (stored: StoredConfig) =>
  Layer.succeed(ConfigStore, {
    path: Effect.succeed("/fake/config.toml"),
    load: Effect.succeed(stored),
    save: () => Effect.succeed(undefined),
  });

let originalApiKey: string | undefined;

beforeEach(() => {
  originalApiKey = process.env.TOMTOM_API_KEY;
  delete process.env.TOMTOM_API_KEY;
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.TOMTOM_API_KEY;
  else process.env.TOMTOM_API_KEY = originalApiKey;
});

describe("ConfigService.resolve precedence", () => {
  test("fails with ConfigError when no API key is available anywhere", async () => {
    const exit = await Effect.runPromiseExit(ConfigService.resolve({}).pipe(Effect.provide(storeLayer({}))));
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("--api-key wins over TOMTOM_API_KEY and the config file", async () => {
    process.env.TOMTOM_API_KEY = "env-key";
    const resolved = await Effect.runPromise(
      ConfigService.resolve({ apiKeyOption: "flag-key" }).pipe(
        Effect.provide(storeLayer({ apiKey: "file-key" })),
      ),
    );
    expect(resolved.apiKey).toBe("flag-key");
  });

  test("TOMTOM_API_KEY wins over the config file", async () => {
    process.env.TOMTOM_API_KEY = "env-key";
    const resolved = await Effect.runPromise(
      ConfigService.resolve({}).pipe(Effect.provide(storeLayer({ apiKey: "file-key" }))),
    );
    expect(resolved.apiKey).toBe("env-key");
  });

  test("falls back to the config file when nothing else is set", async () => {
    const resolved = await Effect.runPromise(
      ConfigService.resolve({}).pipe(Effect.provide(storeLayer({ apiKey: "file-key" }))),
    );
    expect(resolved.apiKey).toBe("file-key");
  });

  test("apiKeyRequired: false allows an empty key through (for `api request --no-auth`)", async () => {
    const resolved = await Effect.runPromise(
      ConfigService.resolve({ apiKeyRequired: false }).pipe(Effect.provide(storeLayer({}))),
    );
    expect(resolved.apiKey).toBe("");
  });

  test("--no-retry forces zero retries regardless of other settings", async () => {
    const resolved = await Effect.runPromise(
      ConfigService.resolve({
        apiKeyOption: "k",
        noRetry: true,
        retryOption: 5,
      }).pipe(Effect.provide(storeLayer({}))),
    );
    expect(resolved.maxRetries).toBe(0);
  });
});
