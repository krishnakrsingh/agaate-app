import { writeFile } from "fs/promises";
import { join } from "path";
const base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
const files = ["tiny_face_detector_model.bin","face_landmark_68_model.bin","face_recognition_model.bin"];
for (const f of files) {
  const url = `${base}/${f}`;
  console.log(`Fetching ${f}...`);
  const res = await fetch(url);
  if (!res.ok) { console.error(`Failed ${f}: ${res.status}`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join("public/models", f), buf);
  console.log(`✓ ${f} ${(buf.length/1024/1024).toFixed(2)} MB`);
}
console.log("Done");
