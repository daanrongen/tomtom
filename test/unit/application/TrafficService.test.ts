import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { incidentDetails, incidents } from "@/application/TrafficService.js";
import { capturingTomTomClientLayer } from "../support/fakeTomTomClient.js";

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
