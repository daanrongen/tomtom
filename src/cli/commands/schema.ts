import { Args, Command } from "@effect/cli";
import { Console, Effect, JSONSchema } from "effect";
import { SCHEMAS } from "@/cli/schemas.js";
import { ValidationError } from "@/domain/shared/errors.js";

export const schema = Command.make(
  "schema",
  { command: Args.text({ name: "command" }).pipe(Args.repeated) },
  (parsed) =>
    Effect.gen(function* () {
      if (parsed.command.length === 0) {
        return yield* Console.log(JSON.stringify(Object.keys(SCHEMAS), null, 2));
      }
      const key = parsed.command.join(" ");
      const found = SCHEMAS[key];
      if (!found) {
        return yield* Effect.fail(
          new ValidationError({
            message: `no schema for "${key}" — available: ${Object.keys(SCHEMAS).join(", ")}`,
          }),
        );
      }
      yield* Console.log(JSON.stringify(JSONSchema.make(found), null, 2));
    }),
).pipe(
  Command.withDescription("Print the JSON Schema for a command's output shape, e.g. `tomtom schema search`"),
);
