import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { brandSearch, categorySearch } from "@/application/SearchService.js";
import { capturingTomTomClientLayer } from "../support/fakeTomTomClient.js";

describe("SearchService.categorySearch", () => {
  test("hits poiSearch with a wildcard query and the given categorySet", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(categorySearch({ categorySet: "7315" }).pipe(Effect.provide(layer)));
    expect(calls[0]?.path).toBe("/search/2/poiSearch/*.json");
    expect(calls[0]?.params.categorySet).toBe("7315");
  });

  test("passes lat/lon/radius and other filters through", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      categorySearch({
        categorySet: "7315",
        lat: 51.5,
        lon: -0.1,
        radius: 2000,
        brandSet: "Starbucks",
      }).pipe(Effect.provide(layer)),
    );
    expect(calls[0]?.params.lat).toBe(51.5);
    expect(calls[0]?.params.lon).toBe(-0.1);
    expect(calls[0]?.params.radius).toBe(2000);
    expect(calls[0]?.params.brandSet).toBe("Starbucks");
  });
});

describe("SearchService.brandSearch", () => {
  test("hits poiSearch with a wildcard query and the given brandSet", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(brandSearch({ brandSet: "Starbucks" }).pipe(Effect.provide(layer)));
    expect(calls[0]?.path).toBe("/search/2/poiSearch/*.json");
    expect(calls[0]?.params.brandSet).toBe("Starbucks");
  });

  test("passes lat/lon/radius and other filters through", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      brandSearch({
        brandSet: "Starbucks",
        lat: 51.5,
        lon: -0.1,
        radius: 2000,
        categorySet: "7315",
      }).pipe(Effect.provide(layer)),
    );
    expect(calls[0]?.params.lat).toBe(51.5);
    expect(calls[0]?.params.lon).toBe(-0.1);
    expect(calls[0]?.params.radius).toBe(2000);
    expect(calls[0]?.params.categorySet).toBe("7315");
  });
});
