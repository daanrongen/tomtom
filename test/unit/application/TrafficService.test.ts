import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { flowSegment, flowTile, incidentDetails, incidents } from "@/application/TrafficService.js";
import { capturingTomTomClientLayer, fakeBinaryTomTomClientLayer } from "../support/fakeTomTomClient.js";

describe("TrafficService.incidents", () => {
  test("passes bbox through and defaults the fields projection", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(incidents({ bbox: "-0.2,51.45,-0.05,51.55" }).pipe(Effect.provide(layer)));
    expect(calls[0]?.path).toBe("/traffic/services/5/incidentDetails");
    expect(calls[0]?.params.bbox).toBe("-0.2,51.45,-0.05,51.55");
    expect(typeof calls[0]?.params.fields).toBe("string");
  });
});

describe("TrafficService.incidentDetails", () => {
  test("passes the incident id as `ids`", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(incidentDetails("abc123").pipe(Effect.provide(layer)));
    expect(calls[0]?.params.ids).toBe("abc123");
  });
});

describe("TrafficService.flowSegment", () => {
  test("builds the path from style/zoom and passes point/unit/thickness/openLr", async () => {
    const { layer, calls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      flowSegment({
        point: "51.5,-0.1",
        style: "relative",
        zoom: 10,
        unit: "mph",
        thickness: 5,
        openLr: true,
      }).pipe(Effect.provide(layer)),
    );
    expect(calls[0]?.path).toBe("/traffic/services/4/flowSegmentData/relative/10/json");
    expect(calls[0]?.params.point).toBe("51.5,-0.1");
    expect(calls[0]?.params.unit).toBe("mph");
    expect(calls[0]?.params.thickness).toBe(5);
    expect(calls[0]?.params.openLr).toBe(true);
  });
});

describe("TrafficService.flowTile", () => {
  test("builds the path from style/zoom/x/y and passes thickness/tileSize", async () => {
    const { layer, binaryCalls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      flowTile({ style: "relative0", zoom: 10, x: 511, y: 340, thickness: 8, tileSize: 512 }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(binaryCalls[0]?.path).toBe("/traffic/map/4/tile/flow/relative0/10/511/340.png");
    expect(binaryCalls[0]?.params.thickness).toBe(8);
    expect(binaryCalls[0]?.params.tileSize).toBe(512);
  });

  test("returns the raw bytes from the client", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const layer = fakeBinaryTomTomClientLayer(() => bytes);
    const result = await Effect.runPromise(
      flowTile({ style: "relative", zoom: 1, x: 0, y: 0 }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(bytes);
  });
});
