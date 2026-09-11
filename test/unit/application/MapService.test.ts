import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { staticImage, tile } from "@/application/MapService.js";
import { capturingTomTomClientLayer, fakeBinaryTomTomClientLayer } from "../support/fakeTomTomClient.js";

describe("MapService.staticImage", () => {
  test("rejects when neither --center nor --bbox is given", async () => {
    const layer = fakeBinaryTomTomClientLayer(() => new Uint8Array());
    const exit = await Effect.runPromiseExit(staticImage({}).pipe(Effect.provide(layer)));
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("rejects when both --center and --bbox are given", async () => {
    const layer = fakeBinaryTomTomClientLayer(() => new Uint8Array());
    const exit = await Effect.runPromiseExit(
      staticImage({ center: "51.5,-0.1", bbox: "-0.2,51.4,0.1,51.6" }).pipe(Effect.provide(layer)),
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  test("converts --center from lat,lon to TomTom's lon,lat order", async () => {
    const { layer, binaryCalls } = capturingTomTomClientLayer();
    await Effect.runPromise(staticImage({ center: "51.5,-0.1", zoom: 12 }).pipe(Effect.provide(layer)));
    expect(binaryCalls[0]?.path).toBe("/map/1/staticimage");
    expect(binaryCalls[0]?.params.center).toBe("-0.1,51.5");
    expect(binaryCalls[0]?.params.zoom).toBe(12);
  });

  test("passes --bbox through in minLon,minLat,maxLon,maxLat order", async () => {
    const { layer, binaryCalls } = capturingTomTomClientLayer();
    await Effect.runPromise(staticImage({ bbox: "-0.2,51.4,0.1,51.6" }).pipe(Effect.provide(layer)));
    expect(binaryCalls[0]?.params.bbox).toBe("-0.2,51.4,0.1,51.6");
  });

  test("returns the raw bytes from the client", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const layer = fakeBinaryTomTomClientLayer(() => bytes);
    const result = await Effect.runPromise(staticImage({ center: "51.5,-0.1" }).pipe(Effect.provide(layer)));
    expect(result).toEqual(bytes);
  });
});

describe("MapService.tile", () => {
  test("builds the path from layer/style/zoom/x/y/format", async () => {
    const { layer, binaryCalls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      tile({ layer: "basic", style: "main", zoom: 10, x: 511, y: 340, format: "png" }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(binaryCalls[0]?.path).toBe("/map/1/tile/basic/main/10/511/340.png");
  });

  test("passes tileSize/view/language as query params", async () => {
    const { layer, binaryCalls } = capturingTomTomClientLayer();
    await Effect.runPromise(
      tile({
        layer: "hybrid",
        style: "night",
        zoom: 5,
        x: 1,
        y: 2,
        format: "jpg",
        tileSize: 512,
        view: "Unified",
        language: "en-GB",
      }).pipe(Effect.provide(layer)),
    );
    expect(binaryCalls[0]?.path).toBe("/map/1/tile/hybrid/night/5/1/2.jpg");
    expect(binaryCalls[0]?.params.tileSize).toBe(512);
    expect(binaryCalls[0]?.params.view).toBe("Unified");
    expect(binaryCalls[0]?.params.language).toBe("en-GB");
  });

  test("returns the raw bytes from the client", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const layer = fakeBinaryTomTomClientLayer(() => bytes);
    const result = await Effect.runPromise(
      tile({ layer: "basic", style: "main", zoom: 1, x: 0, y: 0, format: "png" }).pipe(Effect.provide(layer)),
    );
    expect(result).toEqual(bytes);
  });
});
