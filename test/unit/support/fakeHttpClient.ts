import { HttpClient, HttpClientResponse } from "@effect/platform";
import { Effect, Layer } from "effect";

/** A fake HttpClient.HttpClient layer driven by a plain (request) => Response handler. */
export const fakeHttpClientLayer = (handler: (request: { url: string }) => Response | Promise<Response>) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) =>
      Effect.tryPromise({
        try: async () => HttpClientResponse.fromWeb(request, await handler(request)),
        catch: (cause) => cause as never,
      }),
    ),
  );

export const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

export const binaryResponse = (
  status: number,
  bytes: Uint8Array,
  contentType = "image/png",
  headers: Record<string, string> = {},
): Response =>
  new Response(bytes, {
    status,
    headers: { "content-type": contentType, ...headers },
  });
