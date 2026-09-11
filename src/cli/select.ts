/** One path step: a field name, a numeric index, or `[]` (map the rest of the path over an array). */
type Step =
  | { readonly kind: "field"; readonly name: string }
  | { readonly kind: "index"; readonly at: number }
  | { readonly kind: "map" };

const parsePath = (path: string): ReadonlyArray<Step> =>
  path
    .split(".")
    .flatMap((segment) => {
      const steps: Array<Step> = [];
      let rest = segment;
      const fieldMatch = rest.match(/^[^[]+/);
      if (fieldMatch) {
        steps.push({ kind: "field", name: fieldMatch[0] });
        rest = rest.slice(fieldMatch[0].length);
      }
      for (const bracket of rest.matchAll(/\[(\d*)\]/g)) {
        steps.push(bracket[1] === "" ? { kind: "map" } : { kind: "index", at: Number(bracket[1]) });
      }
      return steps;
    })
    .filter((step) => !(step.kind === "field" && step.name === ""));

const get = (data: unknown, steps: ReadonlyArray<Step>): unknown => {
  if (steps.length === 0) return data;
  const [step, ...rest] = steps as [Step, ...Array<Step>];
  if (data === null || data === undefined) return undefined;
  if (step.kind === "field") {
    return get((data as Record<string, unknown>)[step.name], rest);
  }
  if (step.kind === "index") {
    return get((data as ReadonlyArray<unknown>)[step.at], rest);
  }
  // "map": apply the remaining path to every element of the array.
  if (!Array.isArray(data)) return undefined;
  return data.map((item) => get(item, rest));
};

/** Applies a jq-lite path selector (e.g. "results[].position") to a decoded JSON response. */
export const applySelect = (path: string, data: unknown): unknown => get(data, parsePath(path));
