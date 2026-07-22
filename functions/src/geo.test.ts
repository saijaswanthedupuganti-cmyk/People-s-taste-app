import { describe, expect, it } from "vitest";
import { haversineMeters } from "./geo.js";

describe("haversineMeters", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineMeters(17.4326, 78.4071, 17.4326, 78.4071)).toBe(0);
  });

  it("returns roughly correct distance for two known points", () => {
    // Jubilee Hills to Banjara Hills, Hyderabad - roughly 3.1km apart
    const d = haversineMeters(17.4326, 78.4071, 17.4156, 78.4347);
    expect(d).toBeGreaterThan(2800);
    expect(d).toBeLessThan(3500);
  });

  it("is symmetric", () => {
    const a = haversineMeters(17.4326, 78.4071, 17.4156, 78.4347);
    const b = haversineMeters(17.4156, 78.4347, 17.4326, 78.4071);
    expect(a).toBeCloseTo(b, 6);
  });
});
