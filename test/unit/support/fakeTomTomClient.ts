import { Effect, Layer } from "effect";
import { type QueryParams, TomTomClient } from "@/ports/TomTomClient.js";

/** A fake TomTomClient port — application-service tests never hit the network. */
export const fakeTomTomClientLayer = (
  handler: (path: string, params: QueryParams) => unknown,
) =>
  Layer.succeed(TomTomClient, {
    get: (path, params = {}) => Effect.succeed(handler(path, params)),
    request: () => Effect.die("request() not stubbed in this test"),
  });

export const capturingTomTomClientLayer = () => {
  const calls: Array<{ path: string; params: QueryParams }> = [];
  const layer = Layer.succeed(TomTomClient, {
    get: (path, params = {}) => {
      calls.push({ path, params });
      return Effect.succeed({ results: [] });
    },
    request: () => Effect.die("request() not stubbed in this test"),
  });
  return { layer, calls };
};
