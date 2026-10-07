/**
 * On-device face detection (MediaPipe BlazeFace), served from our own origin — no API
 * key, and the photo never leaves the browser. It finds the eyes, nose and mouth, so
 * sample points land on the real cheeks, forehead and jaw, even when the neck, chest or a
 * skin-coloured wall is in the frame. If it can't load or finds no face, callers fall back
 * to the colour-based heuristic in skinAnalysis.ts.
 */
import type { FaceBox, SamplePoint } from "./skinAnalysis";

type Detector = { detect: (img: HTMLCanvasElement) => { detections: Detection[] } };
type Detection = {
  boundingBox?: { originX: number; originY: number; width: number; height: number };
  keypoints: { x: number; y: number }[];
  categories?: { score: number }[];
};

let detector: Promise<Detector | null> | null = null;

/** MediaPipe's WebAssembly runtime logs routine status lines through console.error — keep them out of the console. */
async function quietly<T>(fn: () => T | Promise<T>): Promise<T> {
  const { error, warn } = console;
  const routine = (args: unknown[]) => typeof args[0] === "string" && /^(INFO:|[IWE]\d{4} |\[\.WebGL)/.test(args[0]);
  console.error = (...args: unknown[]) => void (routine(args) || error(...args));
  console.warn = (...args: unknown[]) => void (routine(args) || warn(...args));
  try {
    return await fn();
  } finally {
    console.error = error;
    console.warn = warn;
  }
}

function load(): Promise<Detector | null> {
  if (!detector) {
    detector = (async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
        return (await quietly(() =>
          FaceDetector.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: "/models/blaze_face_short_range.tflite", delegate: "CPU" },
            runningMode: "IMAGE",
            minDetectionConfidence: 0.5,
          }),
        )) as unknown as Detector;
      } catch (e) {
        console.warn("[face-detect] unavailable, using colour heuristic", e);
        return null;
      }
    })();
  }
  return detector;
}

export type FaceGeometry = { box: FaceBox; points: SamplePoint[] };

/**
 * Detect the most prominent face and place sample points from its landmarks.
 * Keypoint order (BlazeFace): right eye, left eye, nose tip, mouth, right ear, left ear —
 * "right" meaning the person's right, which is on the left of an un-mirrored image.
 */
export async function detectFace(canvas: HTMLCanvasElement): Promise<FaceGeometry | null> {
  const d = await load();
  if (!d) return null;
  let result: { detections: Detection[] };
  try {
    result = await quietly(() => d.detect(canvas));
  } catch {
    return null;
  }
  const W = canvas.width;
  const H = canvas.height;
  const face = result.detections
    .filter((x) => x.boundingBox && x.keypoints.length >= 4)
    .sort((a, b) => b.boundingBox!.width * b.boundingBox!.height - a.boundingBox!.width * a.boundingBox!.height)[0];
  if (!face) return null;

  const px = face.keypoints.map((k) => ({ x: k.x * W, y: k.y * H }));
  const [eyeA, eyeB, , mouth] = px;
  const [left, right] = eyeA.x <= eyeB.x ? [eyeA, eyeB] : [eyeB, eyeA];
  const d2 = Math.hypot(right.x - left.x, right.y - left.y) || W * 0.15;
  // face axes: u runs eye-to-eye, v points down the face (towards the mouth)
  const u = { x: (right.x - left.x) / d2, y: (right.y - left.y) / d2 };
  let v = { x: -u.y, y: u.x };
  const c = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  if ((mouth.x - c.x) * v.x + (mouth.y - c.y) * v.y < 0) v = { x: -v.x, y: -v.y };
  const at = (a: number, b: number) => ({
    x: Math.max(0.02, Math.min(0.98, (c.x + (a * u.x + b * v.x) * d2) / W)),
    y: Math.max(0.02, Math.min(0.98, (c.y + (a * u.y + b * v.y) * d2) / H)),
  });

  const bb = face.boundingBox!;
  // BlazeFace's box is tight around eyes-to-mouth; widen it to the whole face for concern scanning
  const box: FaceBox = {
    x: Math.max(0, bb.originX - bb.width * 0.08),
    y: Math.max(0, bb.originY - bb.height * 0.2),
    w: Math.min(W, bb.width * 1.16),
    h: Math.min(H, bb.height * 1.3),
  };
  return {
    box,
    points: [
      { id: "forehead", ...at(0, -0.6) },
      { id: "left-cheek", ...at(-0.6, 0.6) },
      { id: "right-cheek", ...at(0.6, 0.6) },
      // lower cheek beside the mouth, toward the jaw (where foundation is usually swatched);
      // kept above the jawline itself, which is usually in shadow
      { id: "jaw", ...at(-0.55, 1.05) },
    ],
  };
}
