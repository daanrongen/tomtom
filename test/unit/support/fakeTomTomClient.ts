import { Effect, Layer } from "effect";
import { type QueryParams, TomTomClient } from "@/ports/TomTomClient.js";

/** A fake TomTomClient port — application-service tests never hit the network. */
export const fakeTomTomClientLayer = (handler: (path: string, params: QueryParams) => unknown) =>
  Layer.succeed(TomTomClient, {
    get: (path, params = {}) => Effect.succeed(handler(path, params)),
    post: () => Effect.die("post() not stubbed in this test"),
    getBinary: () => Effect.die("getBinary() not stubbed in this test"),
    request: () => Effect.die("request() not stubbed in this test"),
  });

/** A fake TomTomClient port whose `post` is driven by a handler; `get` dies if called. */
export const fakePostTomTomClientLayer = (handler: (path: string, body: unknown) => unknown) =>
  Layer.succeed(TomTomClient, {
    get: () => Effect.die("get() not stubbed in this test"),
    post: (path, body) => Effect.succeed(handler(path, body)),
    getBinary: () => Effect.die("getBinary() not stubbed in this test"),
    request: () => Effect.die("request() not stubbed in this test"),
  });

/** A fake TomTomClient port whose `getBinary` is driven by a handler; `get`/`post` die if called. */
export const fakeBinaryTomTomClientLayer = (handler: (path: string, params: QueryParams) => Uint8Array) =>
  Layer.succeed(TomTomClient, {
    get: () => Effect.die("get() not stubbed in this test"),
    post: () => Effect.die("post() not stubbed in this test"),
    getBinary: (path, params = {}) => Effect.succeed(handler(path, params)),
    request: () => Effect.die("request() not stubbed in this test"),
  });

export const capturingTomTomClientLayer = () => {
  const calls: Array<{ path: string; params: QueryParams }> = [];
  const postCalls: Array<{ path: string; body: unknown; params: QueryParams }> = [];
  const binaryCalls: Array<{ path: string; params: QueryParams }> = [];
  const layer = Layer.succeed(TomTomClient, {
    get: (path, params = {}) => {
      calls.push({ path, params });
      return Effect.succeed({ results: [] });
    },
    post: (path, body, params = {}) => {
      postCalls.push({ path, body, params });
      return Effect.succeed({ data: [] });
    },
    getBinary: (path, params = {}) => {
      binaryCalls.push({ path, params });
      return Effect.succeed(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    },
    request: () => Effect.die("request() not stubbed in this test"),
  });
  return { layer, calls, postCalls, binaryCalls };
};
