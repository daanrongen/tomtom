import { Effect, Layer } from "effect";
import { type QueryParams, TomTomClient } from "@/ports/TomTomClient.js";

/** A fake TomTomClient port — application-service tests never hit the network. */
export const fakeTomTomClientLayer = (handler: (path: string, params: QueryParams) => unknown) =>
  Layer.succeed(TomTomClient, {
    get: (path, params = {}) => Effect.succeed(handler(path, params)),
    post: () => Effect.die("post() not stubbed in this test"),
    request: () => Effect.die("request() not stubbed in this test"),
  });

/** A fake TomTomClient port whose `post` is driven by a handler; `get` dies if called. */
export const fakePostTomTomClientLayer = (handler: (path: string, body: unknown) => unknown) =>
  Layer.succeed(TomTomClient, {
    get: () => Effect.die("get() not stubbed in this test"),
    post: (path, body) => Effect.succeed(handler(path, body)),
    request: () => Effect.die("request() not stubbed in this test"),
  });

export const capturingTomTomClientLayer = () => {
  const calls: Array<{ path: string; params: QueryParams }> = [];
  const postCalls: Array<{ path: string; body: unknown; params: QueryParams }> = [];
  const layer = Layer.succeed(TomTomClient, {
    get: (path, params = {}) => {
      calls.push({ path, params });
      return Effect.succeed({ results: [] });
    },
    post: (path, body, params = {}) => {
      postCalls.push({ path, body, params });
      return Effect.succeed({ data: [] });
    },
    request: () => Effect.die("request() not stubbed in this test"),
  });
  return { layer, calls, postCalls };
};
