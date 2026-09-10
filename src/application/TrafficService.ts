import { Effect } from "effect";
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
