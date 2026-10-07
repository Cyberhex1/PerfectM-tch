#!/usr/bin/env node
// Copies MediaPipe's WebAssembly runtime into public/ so face detection runs entirely
// on-device from our own origin (no CDN, no API key). Runs on `npm install`.
import { cpSync, existsSync, mkdirSync } from "node:fs";

const from = new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url);
const to = new URL("../public/mediapipe/", import.meta.url);
if (!existsSync(from)) process.exit(0);
mkdirSync(to, { recursive: true });
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  cpSync(new URL(f, from), new URL(f, to));
}
console.log("Copied MediaPipe wasm runtime to public/mediapipe/");
