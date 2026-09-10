import { Context, type Effect } from "effect";
import type { ConfigError } from "@/domain/shared/errors.js";

export type Backend = "tomtom-maps" | "tomtom-orbis-maps";
export type OutputMode = "human" | "json" | "pretty" | "raw";

export interface StoredConfig {
  readonly apiKey?: string;
  readonly backend?: Backend;
  readonly timeout?: string;
  readonly retries?: number;
  readonly output?: OutputMode;
}

export class ConfigStore extends Context.Tag("tomtom/ConfigStore")<
  ConfigStore,
  {
    readonly path: Effect.Effect<string>;
    readonly load: Effect.Effect<StoredConfig, ConfigError>;
    readonly save: (config: StoredConfig) => Effect.Effect<void, ConfigError>;
  }
>() {}
