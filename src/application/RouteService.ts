import { Effect, Either } from "effect";
import * as Coordinate from "@/domain/shared/Coordinate.js";
import { ValidationError } from "@/domain/shared/errors.js";
import { TomTomClient } from "@/ports/TomTomClient.js";
import { type GeocodeResponseShape, geocode } from "./GeocodeService.js";

/** avoid CLI values -> exact TomTom API enum values */
export const AVOID_MAP: Record<string, string> = {
  tolls: "tollRoads",
  highways: "motorways",
  ferries: "ferries",
  "unpaved-roads": "unpavedRoads",
};

const mapAvoid = (
  avoid: ReadonlyArray<string> | undefined,
): string | undefined =>
  avoid && avoid.length > 0
    ? avoid.map((a) => AVOID_MAP[a] ?? a).join(",")
    : undefined;

/** Resolves a waypoint given either as "lat,lon" or a free-text place name (via geocoding). */
export const resolveWaypoint = (input: string) =>
  Effect.gen(function* () {
    const parsed = Coordinate.parse(input);
    if (Either.isRight(parsed)) return parsed.right;

    const result = (yield* geocode({
      query: input,
      limit: 1,
    })) as GeocodeResponseShape;
    const position = result.results?.[0]?.position;
    if (!position) {
      return yield* Effect.fail(
        new ValidationError({
          message: `could not resolve location "${input}"`,
        }),
      );
    }
    return { lat: position.lat, lon: position.lon };
  });

export interface RouteCalculateOptions {
  readonly from: string;
  readonly via: ReadonlyArray<string>;
  readonly to: string;
  readonly routeType?: string;
  readonly traffic?: boolean;
  readonly travelMode?: string;
  readonly avoid?: ReadonlyArray<string>;
  readonly departAt?: string;
  readonly arriveAt?: string;
  readonly maxAlternatives?: number;
  readonly instructionsType?: string;
  readonly language?: string;
  readonly computeBestOrder?: boolean;
  readonly routeRepresentation?: string;
  readonly sectionType?: string;
}

export const calculateRoute = (options: RouteCalculateOptions) =>
  Effect.gen(function* () {
    if (options.departAt && options.arriveAt) {
      return yield* Effect.fail(
        new ValidationError({
          message: "--depart-at and --arrive-at are mutually exclusive",
        }),
      );
    }

    const waypoints = yield* Effect.forEach(
      [options.from, ...options.via, options.to],
      resolveWaypoint,
    );
    const locations = waypoints.map(Coordinate.toParam).join(":");

    const client = yield* TomTomClient;
    return yield* client.get(`/routing/1/calculateRoute/${locations}/json`, {
      routeType: options.routeType,
      traffic: options.traffic,
      travelMode: options.travelMode,
      avoid: mapAvoid(options.avoid),
      departAt: options.departAt,
      arriveAt: options.arriveAt,
      maxAlternatives: options.maxAlternatives,
      instructionsType: options.instructionsType,
      language: options.language,
      computeBestOrder: options.computeBestOrder,
      routeRepresentation: options.routeRepresentation,
      sectionType: options.sectionType,
    });
  });

export interface ReachableRangeOptions {
  readonly from: string;
  readonly timeBudgetInSec?: number;
  readonly distanceBudgetInMeters?: number;
  readonly fuelBudgetInLiters?: number;
  readonly energyBudgetInkWh?: number;
  readonly travelMode?: string;
  readonly traffic?: boolean;
  readonly departAt?: string;
  readonly routeType?: string;
  readonly avoid?: ReadonlyArray<string>;
}

export const reachableRange = (options: ReachableRangeOptions) =>
  Effect.gen(function* () {
    const budgets = [
      options.timeBudgetInSec,
      options.distanceBudgetInMeters,
      options.fuelBudgetInLiters,
      options.energyBudgetInkWh,
    ].filter((budget) => budget !== undefined);

    if (budgets.length !== 1) {
      return yield* Effect.fail(
        new ValidationError({
          message:
            "specify exactly one of --time, --distance, --fuel, --energy",
        }),
      );
    }

    const origin = yield* resolveWaypoint(options.from);
    const client = yield* TomTomClient;
    return yield* client.get(
      `/routing/1/calculateReachableRange/${Coordinate.toParam(origin)}/json`,
      {
        timeBudgetInSec: options.timeBudgetInSec,
        distanceBudgetInMeters: options.distanceBudgetInMeters,
        fuelBudgetInLiters: options.fuelBudgetInLiters,
        energyBudgetInkWh: options.energyBudgetInkWh,
        travelMode: options.travelMode,
        traffic: options.traffic,
        departAt: options.departAt,
        routeType: options.routeType,
        avoid: mapAvoid(options.avoid),
      },
    );
  });
