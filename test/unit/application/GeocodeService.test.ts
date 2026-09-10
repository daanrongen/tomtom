import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { geocode, reverseGeocode } from "@/application/GeocodeService.js";
import { capturingTomTomClientLayer } from "../support/fakeTomTomClient.js";

describe("GeocodeService.geocode", () => {
  test("builds the expected path and query params", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      geocode({
        query: "10 Downing Street, London",
        limit: 1,
        countrySet: "GB",
      }).pipe(Effect.provide(layer)),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.path).toBe("/search/2/geocode/10%20Downing%20Street%2C%20London.json");
    expect(calls[0]?.params).toMatchObject({ limit: 1, countrySet: "GB" });
  });
});

describe("GeocodeService.reverseGeocode", () => {
  test("builds the lat,lon path segment", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(reverseGeocode({ lat: 51.5034, lon: -0.1276 }).pipe(Effect.provide(layer)));
    expect(calls[0]?.path).toBe("/search/2/reverseGeocode/51.5034,-0.1276.json");
  });
});
