import { Schema } from "effect";

const Position = Schema.Struct({ lat: Schema.Number, lon: Schema.Number });

const SearchResult = Schema.Struct({
  poi: Schema.optional(Schema.Struct({ name: Schema.optional(Schema.String) })),
  address: Schema.optional(Schema.Struct({ freeformAddress: Schema.optional(Schema.String) })),
  position: Schema.optional(Position),
  dist: Schema.optional(Schema.Number),
});
const SearchResponse = Schema.Struct({ results: Schema.optional(Schema.Array(SearchResult)) });

const GeocodeResult = Schema.Struct({
  address: Schema.optional(Schema.Struct({ freeformAddress: Schema.optional(Schema.String) })),
  position: Schema.optional(Position),
});
const GeocodeResponse = Schema.Struct({ results: Schema.optional(Schema.Array(GeocodeResult)) });

const ReverseGeocodeResponse = Schema.Struct({
  addresses: Schema.optional(
    Schema.Array(
      Schema.Struct({
        address: Schema.optional(
          Schema.Struct({
            freeformAddress: Schema.optional(Schema.String),
            speedLimit: Schema.optional(Schema.String),
          }),
        ),
        position: Schema.optional(Schema.String),
      }),
    ),
  ),
});

const RouteSummary = Schema.Struct({
  lengthInMeters: Schema.optional(Schema.Number),
  travelTimeInSeconds: Schema.optional(Schema.Number),
  trafficDelayInSeconds: Schema.optional(Schema.Number),
});
const RouteResponse = Schema.Struct({
  routes: Schema.optional(Schema.Array(Schema.Struct({ summary: Schema.optional(RouteSummary) }))),
});

const ReachableRangePoint = Schema.Struct({ latitude: Schema.Number, longitude: Schema.Number });
const ReachableRangeResponse = Schema.Struct({
  reachableRange: Schema.optional(
    Schema.Struct({
      center: Schema.optional(ReachableRangePoint),
      boundary: Schema.optional(Schema.Array(ReachableRangePoint)),
    }),
  ),
});

const MatrixResponse = Schema.Struct({
  data: Schema.optional(
    Schema.Array(
      Schema.Struct({
        originIndex: Schema.optional(Schema.Number),
        destinationIndex: Schema.optional(Schema.Number),
        routeSummary: Schema.optional(
          Schema.Struct({
            lengthInMeters: Schema.optional(Schema.Number),
            travelTimeInSeconds: Schema.optional(Schema.Number),
          }),
        ),
        detailedError: Schema.optional(
          Schema.Struct({
            code: Schema.optional(Schema.String),
            innerError: Schema.optional(Schema.Struct({ code: Schema.optional(Schema.String) })),
          }),
        ),
      }),
    ),
  ),
});

const IncidentsResponse = Schema.Struct({
  incidents: Schema.optional(
    Schema.Array(
      Schema.Struct({
        properties: Schema.optional(
          Schema.Struct({
            iconCategory: Schema.optional(Schema.Number),
            magnitudeOfDelay: Schema.optional(Schema.Number),
            events: Schema.optional(
              Schema.Array(Schema.Struct({ description: Schema.optional(Schema.String) })),
            ),
          }),
        ),
      }),
    ),
  ),
});

const FlowSegmentResponse = Schema.Struct({
  flowSegmentData: Schema.optional(
    Schema.Struct({
      frc: Schema.optional(Schema.String),
      currentSpeed: Schema.optional(Schema.Number),
      freeFlowSpeed: Schema.optional(Schema.Number),
      confidence: Schema.optional(Schema.Number),
      roadClosure: Schema.optional(Schema.Boolean),
    }),
  ),
});

/** Response schemas for every command that returns JSON — keyed by the command path, e.g. "route calculate". */
export const SCHEMAS: Record<string, Schema.Schema.Any> = {
  search: SearchResponse,
  geocode: GeocodeResponse,
  "reverse-geocode": ReverseGeocodeResponse,
  "route calculate": RouteResponse,
  "route reachable-range": ReachableRangeResponse,
  "route matrix": MatrixResponse,
  "traffic incidents": IncidentsResponse,
  "traffic flow segment": FlowSegmentResponse,
};
