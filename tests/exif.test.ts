import { describe, expect, it } from "vitest";
import { exifDate, localDate } from "@/lib/exif";

/** Minimal JPEG: SOI + APP1/EXIF with IFD0 → Exif IFD → DateTimeOriginal. */
function jpegWithDate(date: string, little = true): DataView {
  const tiff = new DataView(new ArrayBuffer(64));
  const u16 = (o: number, v: number) => tiff.setUint16(o, v, little);
  const u32 = (o: number, v: number) => tiff.setUint32(o, v, little);
  tiff.setUint16(0, little ? 0x4949 : 0x4d4d);
  u16(2, 42);
  u32(4, 8); // IFD0 offset
  u16(8, 1); // one entry: Exif IFD pointer
  u16(10, 0x8769);
  u16(12, 4);
  u32(14, 1);
  u32(18, 26);
  u32(22, 0);
  u16(26, 1); // Exif IFD: DateTimeOriginal
  u16(28, 0x9003);
  u16(30, 2);
  u32(32, 20);
  u32(36, 44);
  u32(40, 0);
  [...`${date}\0`].forEach((c, i) => tiff.setUint8(44 + i, c.charCodeAt(0)));

  const out = new Uint8Array(2 + 4 + 6 + 64);
  out.set([0xff, 0xd8, 0xff, 0xe1, 0, 2 + 6 + 64]);
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6);
  out.set(new Uint8Array(tiff.buffer), 12);
  return new DataView(out.buffer);
}

describe("exif date", () => {
  it("reads DateTimeOriginal in both byte orders", () => {
    expect(exifDate(jpegWithDate("2025:03:14 10:20:30"))).toBe("2025-03-14");
    expect(exifDate(jpegWithDate("2024:12:01 23:59:00", false))).toBe("2024-12-01");
  });

  it("ignores non-JPEGs and placeholder dates", () => {
    expect(exifDate(new DataView(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer))).toBeNull();
    expect(exifDate(jpegWithDate("0000:00:00 00:00:00"))).toBeNull();
  });

  it("formats local dates", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
