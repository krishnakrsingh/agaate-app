#!/usr/bin/env node
// Fetch @vladmandic/face-api models to public/models (6.7 MB)
// Usage: node scripts/fetch-face-models.mjs

import { mkdir, writeFile, stat } from "fs/promises";
import { join } from "path";

const base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
const files = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_landmark_68_model_shard1", // alt naming
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
  "tiny_face_detector_model_shard1", // alt
];

const outDir = join(process.cwd(), "public", "models");
await mkdir(outDir, { recursive: true });

// Try multiple bases (jsdelivr and github raw) for resilience
const bases = [
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model",
  "https://raw.githubusercontent.com/vladmandic/face-api/master/model",
  "https://github.com/vladmandic/face-api/raw/master/model",
];

async function fetchOne(name) {
  for (const b of bases) {
    const url = `${b}/${name}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) continue;
      await writeFile(join(outDir, name), buf);
      console.log(`✓ ${name} ← ${b} (${(buf.length/1024).toFixed(1)} KB)`);
      return true;
    } catch {}
  }
  console.warn(`· skip ${name} (not found on any base)`);
  return false;
}

const essential = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
];

let ok = 0;
for (const f of essential) {
  if (await fetchOne(f)) ok++;
}

console.log(`\nDone: ${ok}/${essential.length} essential files fetched to ${outDir}`);
if (ok < essential.length) {
  console.error("Some essential files missing — face enrollment will show 'Models failed to load'. Check network or try again.");
  process.exit(1);
}
