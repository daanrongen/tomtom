import { describe, expect, test } from "bun:test";
import { rewriteSearchAlias } from "@/cli/searchAlias.js";

describe("rewriteSearchAlias", () => {
  test("inserts fuzzy before a bare query", () => {
    expect(rewriteSearchAlias(["search", "coffee shops"])).toEqual([
      "search",
      "fuzzy",
      "coffee shops",
    ]);
  });

  test("leaves a known subcommand untouched", () => {
    expect(rewriteSearchAlias(["search", "poi", "coffee"])).toEqual([
      "search",
      "poi",
      "coffee",
    ]);
  });

  test("leaves a leading flag untouched", () => {
    expect(rewriteSearchAlias(["search", "--json"])).toEqual([
      "search",
      "--json",
    ]);
  });

  test("leaves other commands untouched", () => {
    expect(rewriteSearchAlias(["geocode", "search"])).toEqual([
      "geocode",
      "search",
    ]);
  });

  test("handles bare `search` with nothing after it", () => {
    expect(rewriteSearchAlias(["search"])).toEqual(["search"]);
  });
});
