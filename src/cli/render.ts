import { Console, Option } from "effect";
import { applySelect } from "./select.js";

export interface OutputFlags {
  readonly json: boolean;
  readonly pretty: boolean;
  readonly raw: boolean;
  readonly select: Option.Option<string>;
}

/**
 * `--raw` intentionally renders the same unmodified TomTom body as `--json` for domain
 * commands (this CLI never mutates TomTom fields); true header/status inspection lives
 * in `tomtom api request`, which returns the actual upstream status/headers/text.
 */
export const render = <A>(flags: OutputFlags, data: A, human: (data: A) => string) => {
  const select = Option.getOrUndefined(flags.select);
  if (select !== undefined) {
    const selected = applySelect(select, data);
    return Console.log(flags.pretty ? JSON.stringify(selected, null, 2) : JSON.stringify(selected));
  }
  if (flags.pretty) return Console.log(JSON.stringify(data, null, 2));
  if (flags.json || flags.raw) return Console.log(JSON.stringify(data));
  return Console.log(human(data));
};

export const table = (rows: ReadonlyArray<ReadonlyArray<string>>): string => {
  if (rows.length === 0) return "(no results)";
  const columns = rows[0]?.length ?? 0;
  const widths = Array.from({ length: columns }, (_, col) =>
    Math.max(...rows.map((row) => (row[col] ?? "").length)),
  );
  return rows
    .map((row) =>
      row
        .map((cell, i) => cell.padEnd(widths[i] ?? 0))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
};

interface SearchResultShape {
  readonly poi?: { readonly name?: string };
  readonly address?: { readonly freeformAddress?: string };
  readonly position?: { readonly lat: number; readonly lon: number };
  readonly dist?: number;
}
interface SearchResponseShape {
  readonly results?: ReadonlyArray<SearchResultShape>;
}

export const renderSearchResults = (data: SearchResponseShape): string => {
  const results = data.results ?? [];
  if (results.length === 0) return "(no results)";
  return results
    .map((r) => {
      const name = r.poi?.name ?? r.address?.freeformAddress ?? "(unnamed)";
      const position = r.position ? `${r.position.lat}, ${r.position.lon}` : "";
      const address = r.address?.freeformAddress ?? "";
      const distance = r.dist !== undefined ? `Distance: ${(r.dist / 1000).toFixed(1)} km` : "";
      return [name, position, address, distance].filter(Boolean).join("\n");
    })
    .join("\n\n");
};

interface GeocodeResultShape {
  readonly address?: { readonly freeformAddress?: string };
  readonly position?: { readonly lat: number; readonly lon: number };
}
interface GeocodeResponseShape {
  readonly results?: ReadonlyArray<GeocodeResultShape>;
}

export const renderGeocodeResults = (data: GeocodeResponseShape): string => {
  const results = data.results ?? [];
  if (results.length === 0) return "(no results)";
  return results
    .map((r) => {
      const position = r.position ? `${r.position.lat}, ${r.position.lon}` : "";
      const address = r.address?.freeformAddress ?? "";
      return [address, position].filter(Boolean).join("\n");
    })
    .join("\n\n");
};

interface ReverseGeocodeAddressShape {
  readonly address?: {
    readonly freeformAddress?: string;
    readonly speedLimit?: string;
  };
  readonly position?: string;
}
interface ReverseGeocodeResponseShape {
  readonly addresses?: ReadonlyArray<ReverseGeocodeAddressShape>;
}

export const renderReverseGeocodeResults = (data: ReverseGeocodeResponseShape): string => {
  const addresses = data.addresses ?? [];
  if (addresses.length === 0) return "(no results)";
  return addresses
    .map((a) => [a.address?.freeformAddress ?? "", a.position ?? ""].filter(Boolean).join("\n"))
    .join("\n\n");
};

interface RouteSummaryShape {
  readonly lengthInMeters?: number;
  readonly travelTimeInSeconds?: number;
  readonly trafficDelayInSeconds?: number;
}
interface RouteShape {
  readonly summary?: RouteSummaryShape;
}
interface RouteResponseShape {
  readonly routes?: ReadonlyArray<RouteShape>;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export const renderRoute = (data: RouteResponseShape): string => {
  const routes = data.routes ?? [];
  if (routes.length === 0) return "(no route found)";
  return routes
    .map((route, i) => {
      const summary = route.summary;
      if (!summary) return `Route ${i + 1}: (no summary)`;
      const distanceKm =
        summary.lengthInMeters !== undefined ? (summary.lengthInMeters / 1000).toFixed(1) : "?";
      const duration =
        summary.travelTimeInSeconds !== undefined ? formatDuration(summary.travelTimeInSeconds) : "?";
      const delay =
        summary.trafficDelayInSeconds !== undefined && summary.trafficDelayInSeconds > 0
          ? ` (+${formatDuration(summary.trafficDelayInSeconds)} traffic delay)`
          : "";
      return `Route ${i + 1}: ${distanceKm} km, ${duration}${delay}`;
    })
    .join("\n");
};

interface ReachableRangePoint {
  readonly latitude: number;
  readonly longitude: number;
}
interface ReachableRangeResponseShape {
  readonly reachableRange?: {
    readonly center?: ReachableRangePoint;
    readonly boundary?: ReadonlyArray<ReachableRangePoint>;
  };
}

/** Converts a reachable-range response into a GeoJSON Polygon Feature (TomTom's boundary is unclosed and lat/lon-ordered). */
export const reachableRangeToGeoJson = (data: ReachableRangeResponseShape) => {
  const range = data.reachableRange;
  const boundary = range?.boundary ?? [];
  const ring = boundary.map((p) => [p.longitude, p.latitude]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first && last && (first[0] !== last[0] || first[1] !== last[1]) ? [...ring, first] : ring;
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [closed] },
    properties: range?.center ? { center: { lat: range.center.latitude, lon: range.center.longitude } } : {},
  };
};

export const renderReachableRange = (data: ReachableRangeResponseShape): string => {
  const range = data.reachableRange;
  if (!range?.center) return "(no reachable range)";
  const points = range.boundary?.length ?? 0;
  return `Center: ${range.center.latitude}, ${range.center.longitude}\nBoundary points: ${points}`;
};

interface MatrixCellShape {
  readonly originIndex?: number;
  readonly destinationIndex?: number;
  readonly routeSummary?: {
    readonly lengthInMeters?: number;
    readonly travelTimeInSeconds?: number;
  };
  readonly detailedError?: {
    readonly innerError?: { readonly code?: string };
    readonly code?: string;
  };
}
interface MatrixResponseShape {
  readonly data?: ReadonlyArray<MatrixCellShape>;
}

/** Cells only carry an error code on failure (verified live) — success has no explicit status field. */
const matrixCellStatus = (cell: MatrixCellShape): string =>
  cell.detailedError?.innerError?.code ?? cell.detailedError?.code ?? (cell.routeSummary ? "OK" : "?");

export const renderRouteMatrix = (data: MatrixResponseShape): string => {
  const cells = data.data ?? [];
  if (cells.length === 0) return "(no results)";
  const rows = cells.map((cell) => [
    String(cell.originIndex ?? "?"),
    String(cell.destinationIndex ?? "?"),
    cell.routeSummary?.lengthInMeters !== undefined
      ? `${(cell.routeSummary.lengthInMeters / 1000).toFixed(1)} km`
      : "?",
    cell.routeSummary?.travelTimeInSeconds !== undefined
      ? formatDuration(cell.routeSummary.travelTimeInSeconds)
      : "?",
    matrixCellStatus(cell),
  ]);
  return table([["Origin", "Destination", "Distance", "Duration", "Status"], ...rows]);
};

interface IncidentShape {
  readonly properties?: {
    readonly iconCategory?: number;
    readonly magnitudeOfDelay?: number;
    readonly events?: ReadonlyArray<{ readonly description?: string }>;
  };
}
interface IncidentsResponseShape {
  readonly incidents?: ReadonlyArray<IncidentShape>;
}

interface FlowSegmentResponseShape {
  readonly flowSegmentData?: {
    readonly frc?: string;
    readonly currentSpeed?: number;
    readonly freeFlowSpeed?: number;
    readonly confidence?: number;
    readonly roadClosure?: boolean;
  };
}

export const renderFlowSegment = (data: FlowSegmentResponseShape): string => {
  const segment = data.flowSegmentData;
  if (!segment) return "(no flow data)";
  const closure = segment.roadClosure ? " (closed)" : "";
  return `${segment.frc ?? "?"}: ${segment.currentSpeed ?? "?"}/${segment.freeFlowSpeed ?? "?"} (confidence ${segment.confidence ?? "?"})${closure}`;
};

export const renderIncidents = (data: IncidentsResponseShape): string => {
  const incidents = data.incidents ?? [];
  if (incidents.length === 0) return "(no incidents)";
  return incidents
    .map((incident) => {
      const description = incident.properties?.events
        ?.map((e) => e.description)
        .filter(Boolean)
        .join(", ");
      const category = incident.properties?.iconCategory;
      const magnitude = incident.properties?.magnitudeOfDelay;
      return [
        description || "(no description)",
        category !== undefined ? `Category: ${category}` : "",
        magnitude !== undefined ? `Magnitude of delay: ${magnitude}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
};
