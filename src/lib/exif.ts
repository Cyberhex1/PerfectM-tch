/**
 * Read the date a JPEG was taken (EXIF DateTimeOriginal) so gallery photos default
 * to the right day. Returns "YYYY-MM-DD", or null when there's no usable date.
 */
export async function readPhotoDate(file: Blob): Promise<string | null> {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    return exifDate(new DataView(buf));
  } catch {
    return null;
  }
}

export function exifDate(view: DataView): string | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966 /* "Exif" */) {
      return readTiff(view, offset + 10);
    }
    if (marker === 0xda) return null; // image data starts — no EXIF before it
    offset += 2 + size;
  }
  return null;
}

function readTiff(view: DataView, start: number): string | null {
  const little = view.getUint16(start) === 0x4949;
  const u16 = (o: number) => view.getUint16(start + o, little);
  const u32 = (o: number) => view.getUint32(start + o, little);

  const readIfd = (ifdOffset: number) => {
    const entries = new Map<number, { type: number; count: number; valueOffset: number }>();
    const n = u16(ifdOffset);
    for (let i = 0; i < n; i++) {
      const e = ifdOffset + 2 + i * 12;
      if (start + e + 12 > view.byteLength) break;
      entries.set(u16(e), { type: u16(e + 2), count: u32(e + 4), valueOffset: e + 8 });
    }
    return entries;
  };
  const ascii = (entry?: { type: number; count: number; valueOffset: number }) => {
    if (!entry || entry.type !== 2) return null;
    const at = entry.count > 4 ? u32(entry.valueOffset) : entry.valueOffset;
    let out = "";
    for (let i = 0; i < entry.count - 1 && start + at + i < view.byteLength; i++) out += String.fromCharCode(view.getUint8(start + at + i));
    return out;
  };

  const ifd0 = readIfd(u32(4));
  const exifPtr = ifd0.get(0x8769);
  const exif = exifPtr ? readIfd(u32(exifPtr.valueOffset)) : new Map();
  const raw = ascii(exif.get(0x9003)) ?? ascii(exif.get(0x9004)) ?? ascii(ifd0.get(0x0132));
  const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (!m || m[1] === "0000") return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening photos keep their day). */
export function localDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
