import { describe, expect, test } from "bun:test";
import { RateLimitError, ServerError, toJson, ValidationError } from "@/domain/shared/errors.js";

describe("toJson", () => {
  test("serializes the common fields", () => {
    expect(toJson(new ValidationError({ message: "bad input" }))).toEqual({
      error: { type: "ValidationError", message: "bad input", exitCode: 2 },
    });
  });

  test("includes retryAfterSeconds for RateLimitError when present", () => {
    expect(toJson(new RateLimitError({ message: "slow down", retryAfterSeconds: 30 }))).toEqual({
      error: { type: "RateLimitError", message: "slow down", exitCode: 5, retryAfterSeconds: 30 },
    });
  });

  test("omits retryAfterSeconds for RateLimitError when absent", () => {
    expect(toJson(new RateLimitError({ message: "slow down" }))).toEqual({
      error: { type: "RateLimitError", message: "slow down", exitCode: 5 },
    });
  });

  test("includes status for ServerError", () => {
    expect(toJson(new ServerError({ message: "oops", status: 503 }))).toEqual({
      error: { type: "ServerError", message: "oops", exitCode: 6, status: 503 },
    });
  });
});
