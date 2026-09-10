import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import {
  calculateRoute,
  reachableRange,
  resolveWaypoint,
} from "@/application/RouteService.js";
import {
  capturingTomTomClientLayer,
  fakeTomTomClientLayer,
} from "../support/fakeTomTomClient.js";

describe("RouteService.resolveWaypoint", () => {
  test("parses a lat,lon coordinate without calling the API", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    const result = await Effect.runPromise(
      resolveWaypoint("51.5,-0.1").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual({ lat: 51.5, lon: -0.1 });
    expect(calls).toHaveLength(0);
  });

  test("geocodes a free-text place name", async () => {
    const layer = fakeTomTomClientLayer(() => ({
      results: [{ position: { lat: 51.5, lon: -0.1 } }],
    }));
    const result = await Effect.runPromise(
      resolveWaypoint("London").pipe(Effect.provide(layer)),
    );
    expect(result).toEqual({ lat: 51.5, lon: -0.1 });
  });

  test("fails with ValidationError when geocoding finds nothing", async () => {
    const layer = fakeTomTomClientLayer(() => ({ results: [] }));
    const exit = await Effect.runPromiseExit(
      resolveWaypoint("Nowhereville").pipe(Effect.provide(layer)),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });
});

describe("RouteService.calculateRoute", () => {
  test("rejects depart-at and arrive-at together", async () => {
    const layer = fakeTomTomClientLayer(() => ({ routes: [] }));
    const exit = await Effect.runPromiseExit(
      calculateRoute({
        from: "51.5,-0.1",
        via: [],
        to: "51.6,-0.2",
        departAt: "2026-01-01T00:00:00",
        arriveAt: "2026-01-01T01:00:00",
      }).pipe(Effect.provide(layer)),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("maps avoid aliases to TomTom's exact enum values", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      calculateRoute({
        from: "51.5,-0.1",
        via: [],
        to: "51.6,-0.2",
        avoid: ["tolls", "unpaved-roads"],
      }).pipe(Effect.provide(layer)),
    );
    expect(calls[0]?.params.avoid).toBe("tollRoads,unpavedRoads");
  });
});

describe("RouteService.reachableRange", () => {
  test("requires exactly one budget parameter", async () => {
    const layer = fakeTomTomClientLayer(() => ({}));
    const none = await Effect.runPromiseExit(
      reachableRange({ from: "51.5,-0.1" }).pipe(Effect.provide(layer)),
    );
    expect(Exit.isFailure(none)).toBe(true);

    const both = await Effect.runPromiseExit(
      reachableRange({
        from: "51.5,-0.1",
        timeBudgetInSec: 1800,
        distanceBudgetInMeters: 10000,
      }).pipe(Effect.provide(layer)),
    );
    expect(Exit.isFailure(both)).toBe(true);
  });

  test("accepts a single budget parameter", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      reachableRange({ from: "51.5,-0.1", timeBudgetInSec: 1800 }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(calls[0]?.params.timeBudgetInSec).toBe(1800);
  });
});
