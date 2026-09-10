import { SEARCH_SUBCOMMAND_NAMES } from "./commands/search.js";

/** `tomtom search <query>` is sugar for `tomtom search fuzzy <query>` (spec §7 aliases). */
export const rewriteSearchAlias = (argv: ReadonlyArray<string>): Array<string> => {
  const rewritten = [...argv];
  if (rewritten[0] !== "search") return rewritten;
  const next = rewritten[1];
  if (next === undefined || next.startsWith("-") || SEARCH_SUBCOMMAND_NAMES.includes(next)) return rewritten;
  rewritten.splice(1, 0, "fuzzy");
  return rewritten;
};
