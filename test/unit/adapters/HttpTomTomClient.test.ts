import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import * as HttpTomTomClient from "@/adapters/http/HttpTomTomClient.js";
import { TomTomClient } from "@/ports/TomTomClient.js";
import {
  fakeHttpClientLayer,
  jsonResponse,
} from "../support/fakeHttpClient.js";

const baseConfig = {
  apiKey: "test-key",
  baseUrl: "https://api.tomtom.com",
  timeoutMillis: 5000,
  maxRetries: 2,
  debug: false,
};

const run = <A>(
  handler: Parameters<typeof fakeHttpClientLayer>[0],
  config = baseConfig,
) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return (yield* client.get("/search/2/geocode/London.json")) as A;
  }).pipe(
    Effect.provide(HttpTomTomClient.layer(config)),
    Effect.provide(fakeHttpClientLayer(handler)),
    Effect.runPromiseExit,
  );

describe("HttpTomTomClient", () => {
  test("decodes a successful JSON response", async () => {
    const exit = await run(() => jsonResponse(200, { results: [] }));
    expect(exit._tag).toBe("Success");
  });

  test("maps 401 to AuthError", async () => {
    const exit = await run(() =>
      jsonResponse(401, {
        detailedError: { code: "Unauthorized", message: "no key" },
      }),
    );
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = exit.cause._tag === "Fail" ? exit.cause.error : undefined;
      expect(failure?._tag).toBe("AuthError");
    }
  });

  test("maps 403 to ForbiddenError", async () => {
    const exit = await run(() =>
      jsonResponse(403, {
        detailedError: { code: "Forbidden", message: "no access" },
      }),
    );
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("ForbiddenError");
    } else {
      throw new Error("expected a Fail exit");
    }
  });

  test("maps 429 to RateLimitError and retries, honoring Retry-After", async () => {
    let attempts = 0;
    const exit = await run(() => {
      attempts++;
      return attempts < 2
        ? jsonResponse(
            429,
            {
              detailedError: { code: "TooManyRequests", message: "slow down" },
            },
            {
              "retry-after": "0",
            },
          )
        : jsonResponse(200, { results: [] });
    });
    expect(attempts).toBe(2);
    expect(exit._tag).toBe("Success");
  });

  test("retries 5xx up to maxRetries then fails with ServerError", async () => {
    let attempts = 0;
    const exit = await run(
      () => {
        attempts++;
        return jsonResponse(503, {
          detailedError: { code: "ServiceUnavailable", message: "down" },
        });
      },
      { ...baseConfig, maxRetries: 2 },
    );
    expect(attempts).toBe(3); // 1 initial + 2 retries
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("ServerError");
    } else {
      throw new Error("expected a Fail exit");
    }
  });

  test("maps malformed JSON body to TransportError", async () => {
    const exit = await run(() => new Response("not json", { status: 200 }));
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("TransportError");
    } else {
      throw new Error("expected a Fail exit");
    }
  });

  test("does not retry a 400 validation error", async () => {
    let attempts = 0;
    const exit = await run(() => {
      attempts++;
      return jsonResponse(400, {
        detailedError: { code: "BadRequest", message: "bad input" },
      });
    });
    expect(attempts).toBe(1);
    if (exit._tag === "Failure" && exit.cause._tag === "Fail") {
      expect(exit.cause.error._tag).toBe("ValidationError");
    } else {
      throw new Error("expected a Fail exit");
    }
  });

  test("redacts the API key from a logged URL", () => {
    const url = `https://api.tomtom.com/search/2/geocode/London.json?key=${baseConfig.apiKey}`;
    expect(HttpTomTomClient.redact(url)).not.toContain(baseConfig.apiKey);
    expect(HttpTomTomClient.redact(url)).toContain("key=REDACTED");
  });
});
