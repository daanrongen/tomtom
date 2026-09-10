import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BunContext } from "@effect/platform-bun";
import { Effect } from "effect";
import * as FileConfigStore from "@/adapters/config/FileConfigStore.js";
import { ConfigStore } from "@/ports/ConfigStore.js";

let tempDir: string;
let configPath: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "tomtom-config-test-"));
  configPath = join(tempDir, "tomtom", "config.toml");
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const run = <A>(effect: Effect.Effect<A, unknown, ConfigStore>) =>
  effect.pipe(
    Effect.provide(FileConfigStore.layer(configPath)),
    Effect.provide(BunContext.layer),
    Effect.runPromise,
  );

describe("FileConfigStore", () => {
  test("load returns an empty object when no file exists", async () => {
    const result = await run(
      Effect.gen(function* () {
        const store = yield* ConfigStore;
        return yield* store.load;
      }),
    );
    expect(result).toEqual({});
  });

  test("save then load round-trips values", async () => {
    const result = await run(
      Effect.gen(function* () {
        const store = yield* ConfigStore;
        yield* store.save({
          apiKey: "sk_test",
          backend: "tomtom-maps",
          retries: 3,
        });
        return yield* store.load;
      }),
    );
    expect(result).toEqual({
      apiKey: "sk_test",
      backend: "tomtom-maps",
      retries: 3,
    });
  });

  test("save writes the file with 0600 permissions", async () => {
    const path = await run(
      Effect.gen(function* () {
        const store = yield* ConfigStore;
        yield* store.save({ apiKey: "sk_test" });
        return yield* store.path;
      }),
    );
    const info = await stat(path);
    expect((info.mode & 0o777).toString(8)).toBe("600");
  });
});
