import { Command } from "@effect/cli";
import { Console } from "effect";
import pkg from "../../../package.json" with { type: "json" };
import skillTemplate from "../../../SKILL.md" with { type: "text" };

export const skill = Command.make("skill", {}, () =>
  Console.log(skillTemplate.replace("{{VERSION}}", pkg.version)),
).pipe(
  Command.withDescription(
    "Print this CLI as a Claude Code Agent Skill (SKILL.md) — e.g. `tomtom skill > ~/.claude/skills/tomtom/SKILL.md`",
  ),
);
