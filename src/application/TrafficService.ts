import { Effect } from "effect";
import * as Coordinate from "@/domain/shared/Coordinate.js";
import { TomTomClient } from "@/ports/TomTomClient.js";

const DEFAULT_FIELDS =
  "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity}}}";

export interface TrafficIncidentsOptions {
  readonly bbox: string;
  readonly language?: string;
  readonly category?: string;
  readonly timeValidityFilter?: string;
  readonly fields?: string;
}

export const incidents = (options: TrafficIncidentsOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get("/traffic/services/5/incidentDetails", {
      bbox: options.bbox,
      fields: options.fields ?? DEFAULT_FIELDS,
      language: options.language,
      categoryFilter: options.category,
      timeValidityFilter: options.timeValidityFilter,
    });
  });

export interface IncidentDetailsOptions {
  readonly language?: string;
  readonly fields?: string;
}

export const incidentDetails = (id: string, options: IncidentDetailsOptions = {}) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    return yield* client.get("/traffic/services/5/incidentDetails", {
      ids: id,
      fields: options.fields ?? DEFAULT_FIELDS,
      language: options.language,
    });
  });

export interface FlowSegmentOptions {
  readonly point: string;
  readonly style: string;
  readonly zoom: number;
  readonly unit?: string;
  readonly thickness?: number;
  readonly openLr?: boolean;
}

/** Current speed/travel-time for the road segment nearest a point (Traffic Flow API `GET /traffic/services/4/flowSegmentData`). */
export const flowSegment = (options: FlowSegmentOptions) =>
  Effect.gen(function* () {
    const point = Coordinate.toParam(yield* Coordinate.parse(options.point));
    const client = yield* TomTomClient;
    return yield* client.get(`/traffic/services/4/flowSegmentData/${options.style}/${options.zoom}/json`, {
      point,
      unit: options.unit,
      thickness: options.thickness,
      openLr: options.openLr,
    });
  });

export interface FlowTileOptions {
  readonly style: string;
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
  readonly thickness?: number;
  readonly tileSize?: number;
}

/** Raster traffic-flow tile (Traffic Flow API `GET /traffic/map/4/tile/flow/{style}/{zoom}/{x}/{y}.png`) — returns raw image bytes. */
export const flowTile = (options: FlowTileOptions) =>
  Effect.gen(function* () {
    const client = yield* TomTomClient;
    const path = `/traffic/map/4/tile/flow/${options.style}/${options.zoom}/${options.x}/${options.y}.png`;
    return yield* client.getBinary(path, { thickness: options.thickness, tileSize: options.tileSize });
  });
