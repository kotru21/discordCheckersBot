import { describe, expect, test } from "bun:test";
import {
  isLocalDevInstance,
  isProductionInstanceId,
} from "./validateActivityInstance";

describe("validateActivityInstance", () => {
  test("allows local dev instance id outside production", () => {
    expect(isLocalDevInstance("local")).toBe(true);
    expect(isLocalDevInstance("i-123-gc-456-789")).toBe(false);
  });

  test("rejects local instance id in production", () => {
    const prev = Bun.env.NODE_ENV;
    Bun.env.NODE_ENV = "production";
    try {
      expect(isLocalDevInstance("local")).toBe(false);
    } finally {
      Bun.env.NODE_ENV = prev;
    }
  });

  test("validates production instance ids", () => {
    expect(isProductionInstanceId("i-123-gc-456-789")).toBe(true);
    expect(isProductionInstanceId("local")).toBe(false);
    expect(isProductionInstanceId(null)).toBe(false);
    expect(isProductionInstanceId("")).toBe(false);
  });
});
