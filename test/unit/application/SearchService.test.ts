import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { brandSearch, categorySearch, evSearch } from "@/application/SearchService.js";
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
  test("hits poiSearch with the brand name as the query and as brandSet", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(brandSearch({ brandSet: "Starbucks" }).pipe(Effect.provide(layer)));
    expect(calls[0]?.path).toBe("/search/2/poiSearch/Starbucks.json");
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

describe("SearchService.evSearch", () => {
  test("hits the Orbis EV nearby endpoint with apiVersion and circle params", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(evSearch({ lat: 51.5, lon: -0.1, radius: 5000 }).pipe(Effect.provide(layer)));
    expect(calls[0]?.path).toBe("/maps/orbis/places/ev/nearby");
    expect(calls[0]?.params.apiVersion).toBe(1);
    expect(calls[0]?.params.lat).toBe(51.5);
    expect(calls[0]?.params.lon).toBe(-0.1);
    expect(calls[0]?.params.radius).toBe(5000);
  });

  test("passes bbox and filter params through", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      evSearch({
        topLeft: "51.55,-0.2",
        btmRight: "51.45,-0.05",
        connector: "IEC_62196_T2",
        minPowerKw: 22,
        maxPowerKw: 150,
        status: "Available",
        brandSet: "Tesla",
        paymentBrand: "Visa",
        accessType: "Public",
        vehicleType: "Car",
        vehicleCategory: "PassengerCar",
        limit: 10,
      }).pipe(Effect.provide(layer)),
    );
    expect(calls[0]?.params.topLeft).toBe("51.55,-0.2");
    expect(calls[0]?.params.btmRight).toBe("51.45,-0.05");
    expect(calls[0]?.params.connector).toBe("IEC_62196_T2");
    expect(calls[0]?.params.minPowerKW).toBe(22);
    expect(calls[0]?.params.maxPowerKW).toBe(150);
    expect(calls[0]?.params.status).toBe("Available");
    expect(calls[0]?.params.brand).toBe("Tesla");
    expect(calls[0]?.params.paymentBrand).toBe("Visa");
    expect(calls[0]?.params.accessType).toBe("Public");
    expect(calls[0]?.params.vehicleType).toBe("Car");
    expect(calls[0]?.params.vehicleCategory).toBe("PassengerCar");
    expect(calls[0]?.params.limit).toBe(10);
  });
});
