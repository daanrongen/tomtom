import { describe, expect, test } from "bun:test";
import { Command } from "@effect/cli";
import { BunContext } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { root } from "@/cli/commands/root.js";
import { reachableRangeToGeoJson } from "@/cli/render.js";
import { ConfigStore } from "@/ports/ConfigStore.js";
import { fakeHttpClientLayer, jsonResponse } from "../support/fakeHttpClient.js";

describe("reachableRangeToGeoJson", () => {
  const data = {
    reachableRange: {
      center: { latitude: 51.5, longitude: -0.1 },
      boundary: [
        { latitude: 51.51, longitude: -0.11 },
        { latitude: 51.52, longitude: -0.12 },
        { latitude: 51.53, longitude: -0.13 },
      ],
    },
  };

  test("produces a closed-ring Polygon Feature with [lon, lat] coordinate order", () => {
    const geo = reachableRangeToGeoJson(data);
    expect(geo.type).toBe("Feature");
    expect(geo.geometry.type).toBe("Polygon");
    const ring = geo.geometry.coordinates[0] ?? [];
    expect(ring[0]).toEqual([-0.11, 51.51]);
    expect(ring.length).toBe(data.reachableRange.boundary.length + 1);
    expect(ring[ring.length - 1]).toEqual(ring[0]);
    expect(geo.properties).toEqual({ center: { lat: 51.5, lon: -0.1 } });
  });

  test("does not duplicate the closing point if already closed", () => {
    const firstPoint = data.reachableRange.boundary[0] as { latitude: number; longitude: number };
    const closed = {
      reachableRange: {
        center: data.reachableRange.center,
        boundary: [...data.reachableRange.boundary, firstPoint],
      },
    };
    const geo = reachableRangeToGeoJson(closed);
    expect((geo.geometry.coordinates[0] ?? []).length).toBe(closed.reachableRange.boundary.length);
  });
});

const emptyConfigStoreLayer = Layer.succeed(ConfigStore, {
  path: Effect.succeed("/fake/config.toml"),
  load: Effect.succeed({}),
  save: () => Effect.succeed(undefined),
});

const run = (args: ReadonlyArray<string>) =>
  Command.run(root, { name: "tomtom", version: "test" })(["node", "tomtom", ...args]).pipe(
    Effect.provide(emptyConfigStoreLayer),
    Effect.provide(
      fakeHttpClientLayer(() =>
        jsonResponse(200, {
          reachableRange: { center: { latitude: 51.5, longitude: -0.1 }, boundary: [] },
        }),
      ),
    ),
    Effect.provide(BunContext.layer),
    Effect.runPromiseExit,
  );

describe("route reachable-range --geojson CLI wiring", () => {
  test("succeeds and accepts the flag", async () => {
    const exit = await run([
      "route",
      "reachable-range",
      "--from",
      "51.5,-0.1",
      "--time",
      "600",
      "--geojson",
      "--api-key",
      "k",
    ]);
    expect(exit._tag).toBe("Success");
  });
});
