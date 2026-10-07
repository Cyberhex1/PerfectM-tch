import { describe, expect, it } from "vitest";
import { deltaE2000, hexToLab, labToHex, depthFromLab, undertoneAxisFromLab } from "@/lib/color";

describe("color", () => {
  it("matches CIEDE2000 reference pairs (Sharma et al.)", () => {
    expect(deltaE2000({ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 })).toBeCloseTo(2.0425, 3);
    expect(deltaE2000({ L: 50, a: 2.5, b: 0 }, { L: 50, a: 0, b: -2.5 })).toBeCloseTo(4.3065, 3);
    expect(deltaE2000({ L: 60.2574, a: -34.0099, b: 36.2677 }, { L: 60.4626, a: -34.1751, b: 39.4387 })).toBeCloseTo(1.2644, 3);
  });

  it("round-trips hex through Lab", () => {
    for (const hex of ["#f3cfb3", "#684035", "#a06f4a", "#ffffff", "#000000"]) {
      expect(labToHex(hexToLab(hex))).toBe(hex);
    }
  });

  it("orders depths sensibly", () => {
    expect(depthFromLab(hexToLab("#f9e4d7"))).toBe("fair");
    expect(depthFromLab(hexToLab("#3d2418"))).toBe("rich");
  });

  it("reads pink skin as cooler than golden skin of similar depth", () => {
    expect(undertoneAxisFromLab(hexToLab("#e8b8a8"))).toBeLessThan(undertoneAxisFromLab(hexToLab("#e8bc8c")));
  });
});
