---
name: tomtom
description: Unix-friendly CLI for TomTom's location APIs (search, geocoding, routing, traffic, maps). Use whenever the user wants to search for a place/POI, geocode or reverse-geocode an address, calculate a route/matrix/reachable range, check traffic incidents/flow, render a map image, or needs machine-readable output (JSON Schema, a jq-lite --select, or structured errors) from the command line.
compatibility: tomtom CLI {{VERSION}}
---

# tomtom

A single CLI wrapping TomTom's Search, Geocoding, Routing, Traffic, and Map Display APIs. Every command supports `-h` at any depth for the authoritative flag list.

```bash
tomtom search "coffee amsterdam"                          # fuzzy search (default)
tomtom geocode "Dam Square" --country NL --limit 1         # forward geocode
tomtom reverse-geocode "52.348858,4.894016"                 # coords -> address
tomtom route calculate --from "52.3676,4.9041" --to "52.0907,5.1214" --traffic
tomtom traffic incidents --bbox "4.8,52.3,5.0,52.4"
tomtom map static --center "52.3676,4.9041" --zoom 14 --output map.png
```

## Auth and config

- API key resolution order: `--api-key` flag > `TOMTOM_API_KEY` env var > config file.
- `tomtom config set api-key <key>` writes to the config file (path: `tomtom config path`); `tomtom config get` prints it redacted.
- `tomtom config test` validates the configured key against a real endpoint.

## Scope

This CLI only covers what a standard TomTom API key can reach (classic Maps/Search/Routing/Traffic/Map Display). TomTom's Orbis Maps platform (extended search along-route/geometry, EV routing/search, data visualization) needs a separately provisioned key and is out of scope here — there's no `--backend` flag.

## Global flags

Accepted by nearly every subcommand (omitted below per-command):

| Flag | Does |
|---|---|
| `--json` / `--pretty` | Machine-readable JSON (optionally pretty-printed); default output is short human-readable text |
| `--raw` | Return the upstream response body as-is |
| `--select <path>` | jq-lite selector applied to the response before printing, e.g. `results[].position` (dot fields, `[n]` index, `[]` map-over-array) — bypasses human formatting |
| `--api-key`, `--timeout`, `--connect-timeout`, `--retry`, `--no-retry` | Per-call overrides |
| `-q/--quiet`, `-v/--verbose`, `--debug` | Logging verbosity |

Default (non-`--json`) output is a short plain-text summary per result — name, `lat, lon`, address, and (for `search nearby`/`traffic`) distance or category. Use `--json --pretty` for the full structured response when scripting or when a field isn't in the plain view.

With `--json`/`--pretty`, a failed command prints a structured error instead of plain text: `{"error": {"type": "ValidationError", "message": "...", "exitCode": 2}}` — `type` is one of `AuthError`/`ForbiddenError`/`RateLimitError`/`ValidationError`/`ServerError`/`TransportError`/`ConfigError`, and the process exit code always matches `exitCode`. (This only covers commands that hit the TomTom API — `config get/set/path` and CLI flag-parsing errors from `@effect/cli` itself still print plain text.)

## Agent/introspection commands

```bash
tomtom agent-info           # capability manifest: every command path, global flag, and available schema, as JSON
tomtom schema <command>     # JSON Schema for that command's output shape, e.g. `tomtom schema search`
tomtom schema               # lists the command names tomtom schema knows about
tomtom skill                # prints this file — pipe to a skills directory to (re)install/update it
```

Run `tomtom agent-info` first when scripting against this CLI unattended — it's the fastest way to confirm which commands/flags exist in the installed version without parsing `--help` text.

## Search

```bash
tomtom search fuzzy "<query>" [--lat --lon --radius] [--country] [--category ids] [--brand names] \
  [--view] [--opening-hours] [--typeahead] [--entity-type] [--idx-set]
tomtom search poi "<query>" [same flags as fuzzy]
tomtom search nearby --lat <f> --lon <f> [--radius] [--limit]
tomtom search category "<category-ids>" [--lat --lon --radius] [--brand] [--country] [--limit] [--offset]
tomtom search brand "<brand>" [--lat --lon --radius] [--category] [--country] [--limit] [--offset]
```

- `tomtom search <query>` defaults to `fuzzy`.
- `--category` takes comma-separated **numeric** TomTom category IDs (e.g. `7315` = restaurants), not free text — look these up in TomTom's Category Search reference.
- `--brand` takes comma-separated brand names (e.g. `Starbucks`).
- `--top-left`/`--btm-right` bias results to a bounding box; `--lat`/`--lon`/`--radius` bias to a point.
- `search category <ids>` and `search brand <name>` are dedicated commands (not just filters on fuzzy) — the ID/name is a positional argument.

## Geocoding

```bash
tomtom geocode "<query>" [--country|--countrySet] [--limit] [--entity-type] [--lat --lon --radius]
tomtom reverse-geocode "<lat,lon>" [--radius] [--heading] [--return-speed-limit]
```

- `geocode` without a strong country/geo bias can match globally (a bare place name can resolve to the wrong country) — pass `--country <ISO2>` or a lat/lon bias for precision.
- `reverse-geocode` takes a single `"lat,lon"` positional argument (comma, no space).

## Routing

```bash
tomtom route calculate --from <place|lat,lon> --to <place|lat,lon> [--via ...] [--avoid ...] \
  [--travel-mode car|truck|...] [--route-type fastest|shortest|eco|...] [--traffic] \
  [--depart-at|--arrive-at] [--alternatives N] [--instructions none|coded|tagged] \
  [--compute-best-order] [--route-representation] [--section-type]

tomtom route matrix --input <path.json>

tomtom route reachable-range --from <place|lat,lon> [--time secs] [--distance m] \
  [--fuel L] [--energy kWh] [--travel-mode] [--traffic] [--depart-at] [--route-type] [--avoid ...] [--geojson]
```

- `--from`/`--via`/`--to` each accept either a place name or a `"lat,lon"` pair; `--via` repeats for multiple waypoints.
- `--avoid` repeats, one of `tolls | highways | ferries | unpaved-roads` per flag.
- `--compute-best-order` reorders waypoints for the most efficient trip (multi-stop routes).
- `route matrix` batches routing across many origins x destinations; `--input` points at a JSON file (origins/destinations payload) — see `tomtom route matrix -h` for the expected shape.
- `reachable-range` needs exactly one budget dimension (`--time`, `--distance`, `--fuel`, or `--energy`) — it returns a polygon boundary (`Boundary points: N` in plain output; full coordinates under `--json`); `--geojson` converts it into a standard GeoJSON `Feature`/`Polygon` (closed ring, `[lon, lat]` order) instead of TomTom's raw `{latitude, longitude}` shape.

## Traffic

```bash
tomtom traffic incidents --bbox "<minLon,minLat,maxLon,maxLat>" [--category] [--time-window]
tomtom traffic details <incident-id>
tomtom traffic flow segment --point "<lat,lon>" --style <style> --zoom <0-22> [--unit kmph|mph] [--open-lr]
tomtom traffic flow tile --style <style> --zoom <0-22> --tile-x <n> --tile-y <n> [--tile-size 256|512] [--output path]
```

- `--style` for flow commands: `absolute | relative | relative0 | relative0-dark | relative-delay | reduced-sensitivity`.
- `flow segment` returns current speed/travel-time for the road segment nearest a point; `flow tile` returns a raw PNG raster tile — `--json`/`--pretty` don't apply, use `--output <path>` (or `-`/omit for stdout).

## Maps

```bash
tomtom map static [--center <lat,lon> | --bbox <minLon,minLat,maxLon,maxLat>] [--zoom] [--width] [--height] \
  [--format png|jpg|jpeg] [--layer basic|hybrid|labels] [--style main|night] [--output path]

tomtom map tile [--layer basic|hybrid|labels] [--style main|night] --zoom <0-22> --tile-x <n> --tile-y <n> \
  [--format png|jpg] [--tile-size 256|512] [--output path]
```

- `--center` and `--bbox` are mutually exclusive on `map static`.
- Both return raw image bytes — `--json`/`--pretty` don't apply; use `--output <path>` (or `-`/omit for stdout).

## Escape hatch

```bash
tomtom api request --method GET --path "/search/2/geocode/{query}.json" --param "query=Amsterdam"
```

For endpoints the CLI doesn't wrap yet (or a param it doesn't expose): call any TomTom endpoint directly. `--path` supports `{placeholder}` segments filled from repeated `--param key=value`; `--no-auth` skips attaching the API key.
