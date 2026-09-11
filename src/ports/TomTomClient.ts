import { Context, type Effect } from "effect";
import type { TomTomError } from "@/domain/shared/errors.js";

export type QueryParams = Record<string, string | number | boolean | undefined>;

export interface RawRequest {
  readonly method: string;
  readonly url: string;
  readonly params?: QueryParams;
  readonly auth: boolean;
}

export interface RawResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export class TomTomClient extends Context.Tag("tomtom/TomTomClient")<
  TomTomClient,
  {
    /** GET a TomTom endpoint relative to the configured base URL; injects the API key, retries transient failures, and decodes JSON. */
    readonly get: (path: string, params?: QueryParams) => Effect.Effect<unknown, TomTomError>;
    /** POST a JSON body to a TomTom endpoint; same auth/retry/decode behavior as {@link get}. */
    readonly post: (path: string, body: unknown, params?: QueryParams) => Effect.Effect<unknown, TomTomError>;
    /** The `api request` escape hatch: arbitrary method/URL, optional auth, raw text body back. */
    readonly request: (input: RawRequest) => Effect.Effect<RawResponse, TomTomError>;
  }
>() {}
