import { Effect } from "effect";
import { TomTomClient } from "@/ports/TomTomClient.js";

export interface RawApiRequestOptions {
  readonly method: string;
  readonly url: string;
  readonly params?: Record<string, string>;
  readonly auth: boolean;
}

export const request = (options: RawApiRequestOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.request({
      method: options.method,
      url: options.url,
      params: options.params,
      auth: options.auth,
    });
  });
