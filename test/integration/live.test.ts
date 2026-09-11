import { describe, expect, test } from "bun:test";
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";
import * as HttpTomTomClient from "@/adapters/http/HttpTomTomClient.js";
import { geocode } from "@/application/GeocodeService.js";
import { staticImage, tile } from "@/application/MapService.js";
import { incidents } from "@/application/TrafficService.js";
import type { TomTomClient } from "@/ports/TomTomClient.js";

const apiKey = process.env.TOMTOM_API_KEY;

const run = <A, E>(effect: Effect.Effect<A, E, TomTomClient>) =>
  effect.pipe(
    Effect.provide(
      HttpTomTomClient.layer({
        apiKey: apiKey ?? "",
        baseUrl: process.env.TOMTOM_API_HOST ?? "https://api.tomtom.com",
        timeoutMillis: 15_000,
        maxRetries: 2,
        debug: false,
      }),
    ),
    Effect.provide(FetchHttpClient.layer),
    Effect.runPromise,
  );

describe.skipIf(!apiKey)("live TomTom API", () => {
  test("geocode returns at least one result for a well-known address", async () => {
    const data = (await run(geocode({ query: "10 Downing Street, London", limit: 1 }))) as {
      results?: ReadonlyArray<unknown>;
    };
    expect(data.results?.length ?? 0).toBeGreaterThan(0);
  });

  test("traffic incidents returns a well-formed response for a real bounding box", async () => {
    const data = (await run(incidents({ bbox: "-0.489,51.28,0.236,51.686" }))) as {
      incidents?: ReadonlyArray<unknown>;
    };
    expect(Array.isArray(data.incidents)).toBe(true);
  });

  test("map static returns a real PNG image for a center point", async () => {
    const bytes = await run(staticImage({ center: "51.5074,-0.1278", zoom: 12 }));
    expect(bytes.length).toBeGreaterThan(0);
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  test("map tile returns a real PNG tile", async () => {
    const bytes = await run(tile({ layer: "basic", style: "main", zoom: 10, x: 511, y: 340, format: "png" }));
    expect(bytes.length).toBeGreaterThan(0);
    expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});
